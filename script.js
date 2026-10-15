(() => {
  "use strict";

  // Настройки твоего проекта Supabase
  const SUPABASE_URL =
    "https://igixtidnujhdyogkikzz.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_TzwrhJ6MAKc8DOtTO5PAlw_5GMmD58Z";

  const statusEl = document.getElementById("status");
  const productsCountEl = document.getElementById("productsCount");
  const totalValueEl = document.getElementById("totalValue");
  const productsMessageEl = document.getElementById("productsMessage");
  const productsTableEl = document.getElementById("productsTable");
  const productsBodyEl = document.getElementById("productsBody");
  const structureMessageEl = document.getElementById("structureMessage");
  const structureTablesEl = document.getElementById("structureTables");
  const refreshAllBtn = document.getElementById("refreshAllBtn");
  const refreshProductsBtn = document.getElementById("refreshProductsBtn");

  let dbClient = null;
  let loading = false;

  function setStatus(text, type = "") {
    statusEl.textContent = text;
    statusEl.className = "status";

    if (type) statusEl.classList.add(type);
  }

  function showMessage(element, text, type = "") {
    element.hidden = false;
    element.className = "message";

    if (type) element.classList.add(type);

    element.textContent = text;
  }

  function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value == null ? "—" : String(value);

    if (className) cell.className = className;

    row.appendChild(cell);
    return cell;
  }

  function formatNumber(value) {
    if (value == null || value === "") return "—";

    const number = Number(value);

    if (!Number.isFinite(number)) return String(value);

    return new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2
    }).format(number);
  }

  function renderProduct(product) {
    const row = document.createElement("tr");

    addCell(row, product.id);
    addCell(row, product.name);
    addCell(row, formatNumber(product.price));
    addCell(row, formatNumber(product.quantity));
    addCell(row, formatNumber(product.total));

    return row;
  }

  async function loadProducts() {
    productsBodyEl.replaceChildren();
    productsTableEl.hidden = true;

    productsCountEl.textContent = "—";
    totalValueEl.textContent = "—";

    showMessage(productsMessageEl, "Загружаем товары...");

    try {
      // Читаем реальные записи таблицы products
      const { data, error } = await dbClient
        .from("products")
        .select("id, name, price, quantity, total")
        .order("id", { ascending: true });

      if (error) throw error;

      const products = data || [];
      const fragment = document.createDocumentFragment();

      products.forEach((product) => {
        fragment.appendChild(renderProduct(product));
      });

      productsBodyEl.appendChild(fragment);
      productsCountEl.textContent = String(products.length);

      const total = products.reduce((sum, product) => {
        const value = Number(product.total);

        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);

      totalValueEl.textContent = formatNumber(total);

      if (products.length === 0) {
        showMessage(
          productsMessageEl,
          "Таблица доступна, но записей пока нет."
        );
      } else {
        productsMessageEl.hidden = true;
        productsTableEl.hidden = false;
      }

      return true;
    } catch (error) {
      console.error("Ошибка загрузки продуктов:", error);

      showMessage(
        productsMessageEl,
        "Не удалось получить товары. " +
        (error.message || String(error)) +
        " Проверь разрешение SELECT и политики RLS для products.",
        "error"
      );

      return false;
    }
  }

  async function loadStructure() {
    structureTablesEl.replaceChildren();

    showMessage(
      structureMessageEl,
      "Загружаем структуру таблицы..."
    );

    try {
      const { data, error } = await dbClient
        .rpc("get_database_structure");

      if (error) throw error;

      if (!Array.isArray(data)) {
        throw new Error("API вернул неожиданный формат структуры.");
      }

      const grouped = new Map();

      data.forEach((column) => {
        if (!grouped.has(column.table_name)) {
          grouped.set(column.table_name, []);
        }

        grouped.get(column.table_name).push(column);
      });

      if (grouped.size === 0) {
        showMessage(
          structureMessageEl,
          "В схеме public не найдено доступных столбцов."
        );
        return true;
      }

      grouped.forEach((columns, tableName) => {
        columns.sort(
          (a, b) => a.ordinal_position - b.ordinal_position
        );

        const card = document.createElement("article");
        card.className = "table-card";

        const heading = document.createElement("div");
        heading.className = "table-title";

        const icon = document.createElement("span");
        icon.className = "table-icon";
        icon.textContent = "▦";

        const title = document.createElement("strong");
        title.textContent = tableName;

        const count = document.createElement("span");
        count.className = "column-count";
        count.textContent = `${columns.length} столб.`;

        heading.append(icon, title, count);
        card.appendChild(heading);

        const scroll = document.createElement("div");
        scroll.className = "table-scroll";

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const header = document.createElement("tr");

        ["Столбец", "Тип данных", "NULL", "Позиция"]
          .forEach((label) => {
            const th = document.createElement("th");
            th.textContent = label;
            header.appendChild(th);
          });

        thead.appendChild(header);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        columns.forEach((column) => {
          const row = document.createElement("tr");

          addCell(row, column.column_name);

          const typeCell = addCell(row, column.data_type);
          const code = document.createElement("code");
          code.textContent = column.data_type;
          typeCell.replaceChildren(code);

          const nullable = column.is_nullable === "YES";

          addCell(
            row,
            nullable ? "Да" : "Нет",
            nullable ? "null-yes" : "null-no"
          );

          addCell(row, column.ordinal_position);

          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        scroll.appendChild(table);
        card.appendChild(scroll);
        structureTablesEl.appendChild(card);
      });

      structureMessageEl.hidden = true;
      return true;
    } catch (error) {
      console.error("Ошибка загрузки структуры:", error);

      showMessage(
        structureMessageEl,
        "Не удалось загрузить структуру: " +
        (error.message || String(error)) +
        " Проверь SQL-функцию get_database_structure.",
        "error"
      );

      return false;
    }
  }

  async function refreshAll() {
    if (loading) return;

    loading = true;
    refreshAllBtn.disabled = true;
    refreshProductsBtn.disabled = true;

    setStatus("Загрузка...");

    try {
      const results = await Promise.all([
        loadProducts(),
        loadStructure()
      ]);

      if (results.every(Boolean)) {
        setStatus("Подключено", "ok");
      } else {
        setStatus("Есть ошибка", "error");
      }
    } finally {
      loading = false;
      refreshAllBtn.disabled = false;
      refreshProductsBtn.disabled = false;
    }
  }

  async function refreshProductsOnly() {
    if (loading) return;

    loading = true;
    refreshProductsBtn.disabled = true;

    try {
      const ok = await loadProducts();
      setStatus(ok ? "Подключено" : "Ошибка", ok ? "ok" : "error");
    } finally {
      loading = false;
      refreshProductsBtn.disabled = false;
    }
  }

  function initialize() {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      showMessage(
        productsMessageEl,
        "Не загрузилась библиотека Supabase JS. " +
        "Проверь подключение к CDN.",
        "error"
      );

      showMessage(
        structureMessageEl,
        "Библиотека Supabase недоступна.",
        "error"
      );

      setStatus("Ошибка", "error");
      return;
    }

    try {
      dbClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );
    } catch (error) {
      console.error("Ошибка инициализации Supabase:", error);

      setStatus("Ошибка", "error");

      showMessage(
        productsMessageEl,
        "Не удалось создать клиент: " + error.message,
        "error"
      );

      return;
    }

    refreshAllBtn.addEventListener("click", refreshAll);
    refreshProductsBtn.addEventListener("click", refreshProductsOnly);

    refreshAll();
  }

  initialize();
})();
