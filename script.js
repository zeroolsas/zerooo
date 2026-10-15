const SUPABASE_URL =
  "https://igixtidnujhdyogkikzz.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_TzwrhJ6MAKc8DOtTO5PAlw_5GMmD58Z";

const { createClient } = window.supabase;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const tablesEl = document.getElementById("tables");
const tableCountEl = document.getElementById("tableCount");
const columnCountEl = document.getElementById("columnCount");
const refreshBtn = document.getElementById("refreshBtn");

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = "status";

  if (type) {
    statusEl.classList.add(type);
  }
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
    .forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  columns.forEach(column => {
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
  refreshBtn.disabled = true;
  tablesEl.replaceChildren();

  messageEl.className = "message";
  messageEl.textContent = "Загружаем структуру базы данных...";

  tableCountEl.textContent = "—";
  columnCountEl.textContent = "—";
  setStatus("Загрузка...");

  try {
    const { data, error } = await supabase.rpc(
      "get_database_structure"
    );

    if (error) {
      throw error;
    }

    if (!Array.isArray(data)) {
      throw new Error("Сервер вернул неожиданный формат данных.");
    }

    const grouped = new Map();

    data.forEach(column => {
      if (!grouped.has(column.table_name)) {
        grouped.set(column.table_name, []);
      }

      grouped.get(column.table_name).push(column);
    });

    const entries = [...grouped.entries()];

    entries.forEach(([tableName, columns]) => {
      tablesEl.appendChild(renderTable(tableName, columns));
    });

    tableCountEl.textContent = entries.length;
    columnCountEl.textContent = data.length;

    if (entries.length === 0) {
      messageEl.textContent =
        "Таблицы не найдены в схеме public.";
      messageEl.hidden = false;
    } else {
      messageEl.hidden = true;
    }

    setStatus("Подключено", "ok");
  } catch (error) {
    console.error("Supabase error:", error);

    messageEl.hidden = false;
    messageEl.className = "message error";
    messageEl.textContent =
      "Не удалось загрузить структуру. Проверь подключение " +
      "и SQL-функцию get_database_structure в Supabase. " +
      (error.message || "");

    setStatus("Ошибка", "error");
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", loadStructure);

loadStructure();
