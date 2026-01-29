import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Monitor, BarChart3 } from 'lucide-react';

const Layout = ({ children }) => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/user-analytics', icon: Activity, label: 'Análise por Usuário' },
    { path: '/activities', icon: Activity, label: 'Atividades' },
    { path: '/computers', icon: Monitor, label: 'Computadores' },
    { path: '/stats', icon: BarChart3, label: 'Estatísticas' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-10">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary-600">PC Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Monitoramento</p>
        </div>
        
        <nav className="p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
