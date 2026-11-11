function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Шапка панелі CRM */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              B2B Mini-CRM
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Система управління клієнтами та комерційними угодами
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            API Online
          </span>
        </header>

        {/* Картка угоди для перевірки Tailwind */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Угода #1024
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              Впровадження ERP-системи
            </h3>
            <p className="text-sm text-slate-500">
              Клієнт: ТОВ «Прогрес-Буд»
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900">
              $14,500
            </div>
            <span className="inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded bg-amber-100 text-amber-800">
              Комерційна пропозиція
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;