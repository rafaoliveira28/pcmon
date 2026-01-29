import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Monitor, BarChart3, User, Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/user-analytics', icon: User, label: 'Análise por Usuário' },
    { path: '/activities', icon: Activity, label: 'Atividades' },
    { path: '/computers', icon: Monitor, label: 'Computadores' },
    { path: '/stats', icon: BarChart3, label: 'Estatísticas' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-white shadow-lg z-50 transition-all duration-300 ${
          isSidebarHovered ? 'w-64' : 'w-20'
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className={`p-6 border-b ${!isSidebarHovered && 'px-4'}`}>
          {isSidebarHovered ? (
            <>
              <h1 className="text-2xl font-bold text-primary-600">PC Monitor</h1>
              <p className="text-sm text-gray-500 mt-1">Sistema de Monitoramento</p>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-primary-600 text-center">PM</h1>
          )}
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
                } ${!isSidebarHovered && 'justify-center'}`
              }
              title={!isSidebarHovered ? item.label : ''}
            >
              <item.icon size={20} />
              {isSidebarHovered && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content - margem fixa */}
      <main className="ml-20 p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
