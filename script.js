(() => {
  async function initProducts() {
    const list = document.getElementById("products-list");
    const status = document.getElementById("status");

    if (!list || !status) {
      console.error(
        'Добавь элементы id="products-list" и id="status" в index.html'
      );
      return;
    }

    list.replaceChildren();
    status.textContent = "Загружаем товары из Supabase...";

    try {
      if (!window.supabase?.createClient) {
        throw new Error(
          "Не загружена библиотека Supabase. Проверь подключение CDN в index.html."
        );
      }

      const client = window.supabase.createClient(
        "https://igixtidnujhdyogkikzz.supabase.co",
        "sb_publishable_TzwrhJ6MAKc8DOtTO5PAlw_5GMmD58Z"
      );

      const { data, error } = await client
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        status.textContent =
          "Товары не найдены. Проверь таблицу products и настройки RLS.";
        return;
      }

      const table = document.createElement("table");
      table.className = "products-table";

      const columns = Object.keys(data[0]);
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      for (const column of columns) {
        const th = document.createElement("th");
        th.textContent = column;
        headerRow.appendChild(th);
      }

      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      for (const product of data) {
        const row = document.createElement("tr");

        for (const column of columns) {
          const cell = document.createElement("td");
          const value = product[column];

          cell.textContent =
            value === null || value === undefined
              ? "—"
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);

          row.appendChild(cell);
        }

        tbody.appendChild(row);
      }

      table.appendChild(tbody);
      list.replaceChildren(table);
      status.textContent = `Загружено товаров: ${data.length}`;
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
      status.textContent =
        "Не удалось загрузить товары: " +
        (error?.message || "неизвестная ошибка");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProducts, {
      once: true
    });
  } else {
    initProducts();
  }
})();
