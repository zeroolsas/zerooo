(() => {
  "use strict";

  // Настройки проекта Supabase
  const SUPABASE_URL =
    "https://igixtidnujhdyogkikzz.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_TzwrhJ6MAKc8DOtTO5PAlw_5GMmD58Z";

  // Защита от повторного запуска этого скрипта
  if (window.__supabaseExplorerInitialized) {
    console.warn("Supabase Explorer уже запущен.");
    return;
  }
  window.__supabaseExplorerInitialized = true;

  const statusEl = document.getElementById("status");
  const messageEl = document.getElementById("message");
  const tablesEl = document.getElementById("tables");
  const tableCountEl = document.getElementById("tableCount");
  const columnCountEl = document.getElementById("columnCount");
  const refreshBtn = document.getElementById("refreshBtn");

  let dbClient = null;

  function setStatus(text, type = "") {
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.className = "status";

    if (type) {
      statusEl.classList.add(type);
    }
  }

  function showMessage(text, isError = false) {
    if (!messageEl) return;

    messageEl.hidden = false;
    messageEl.className = isError
      ? "message error"
      : "message";

    messageEl.textContent = text;
  }

  function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "—");

    if (className) {
      cell.className = className;
    }

    row.appendChild(cell);
  }

  function renderTable(tableName, columns) {
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
    count.textContent = `${columns.length} столб.`;

    heading.append(icon, title, count);
    card.appendChild(heading);

    const scroll = document.createElement("div");
    scroll.className = "table-scroll";

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["Столбец", "Тип данных", "NULL", "Позиция"]
      .forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        headerRow.appendChild(th);
      });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    columns.forEach((column) => {
      const row = document.createElement("tr");

      addCell(row, column.column_name);

      const typeCell = document.createElement("td");
      const code = document.createElement("code");
      code.textContent = column.data_type;
      typeCell.appendChild(code);
      row.appendChild(typeCell);

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

    return card;
  }

  async function loadStructure() {
    if (!dbClient) {
      showMessage(
        "Клиент Supabase не инициализирован. " +
        "Проверь загрузку библиотеки Supabase JS.",
        true
      );
      setStatus("Ошибка", "error");
      return;
    }

    if (refreshBtn) refreshBtn.disabled = true;

    tablesEl?.replaceChildren();

    if (tableCountEl) tableCountEl.textContent = "—";
    if (columnCountEl) columnCountEl.textContent = "—";

    showMessage("Загружаем структуру базы данных...");
    setStatus("Загрузка...");

    try {
      const { data, error } = await dbClient.rpc(
        "get_database_structure"
      );

      if (error) {
        throw error;
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Неожиданный ответ сервера. Ожидался список столбцов."
        );
      }

      const grouped = new Map();

      data.forEach((column) => {
        if (
          !column.table_name ||
          !column.column_name ||
          !column.data_type
        ) {
          return;
        }

        if (!grouped.has(column.table_name)) {
          grouped.set(column.table_name, []);
        }

        grouped.get(column.table_name).push(column);
      });

      const entries = [...grouped.entries()];

      entries.forEach(([tableName, columns]) => {
        columns.sort(
          (a, b) => a.ordinal_position - b.ordinal_position
        );

        tablesEl.appendChild(
          renderTable(tableName, columns)
        );
      });

      if (tableCountEl) {
        tableCountEl.textContent = String(entries.length);
      }

      if (columnCountEl) {
        const totalColumns = entries.reduce(
          (total, [, columns]) => total + columns.length,
          0
        );

        columnCountEl.textContent = String(totalColumns);
      }

      if (entries.length === 0) {
        showMessage(
          "Таблицы не найдены в схеме public. " +
          "Проверь, есть ли таблицы и настроена ли SQL-функция."
        );
      } else {
        messageEl.hidden = true;
      }

      setStatus("Подключено", "ok");
    } catch (error) {
      console.error(
        "Ошибка загрузки структуры Supabase:",
        error
      );

      const details = error?.message || String(error);

      showMessage(
        "Не удалось загрузить структуру базы данных. " +
        "Проверь SQL-функцию get_database_structure, " +
        "права доступа и настройки API. Ошибка: " + details,
        true
      );

      setStatus("Ошибка", "error");
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function initialize() {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      showMessage(
        "Не загрузилась библиотека Supabase JS. " +
        "Проверь подключение к CDN в index.html.",
        true
      );
      setStatus("Ошибка", "error");
      return;
    }

    if (!tablesEl || !messageEl || !statusEl) {
      console.error(
        "Не найдены элементы интерфейса. Проверь index.html."
      );
      return;
    }

    try {
      dbClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );
    } catch (error) {
      console.error("Ошибка инициализации Supabase:", error);
      showMessage(
        "Не удалось инициализировать клиент Supabase: " +
        (error.message || String(error)),
        true
      );
      setStatus("Ошибка", "error");
      return;
    }

    refreshBtn?.addEventListener("click", loadStructure);
    loadStructure();
  }

  initialize();
})();
