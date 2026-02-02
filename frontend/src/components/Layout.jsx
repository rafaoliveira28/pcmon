import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Activity, Monitor, BarChart3, User, Menu, X, Users, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/user-analytics', icon: User, label: 'Análise por Usuário' },
    { path: '/activities', icon: Activity, label: 'Atividades' },
    { path: '/computers', icon: Monitor, label: 'Computadores' },
    { path: '/stats', icon: BarChart3, label: 'Estatísticas' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/settings', icon: Settings, label: 'Configurações' });
  }

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair?')) {
      await logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-white shadow-lg z-50 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarHovered ? 'w-64' : 'w-20'
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className={`p-6 border-b transition-all duration-300 ${!isSidebarHovered && 'px-4'}`}>
          <div className="relative">
            <h1 className={`text-2xl font-bold text-primary-600 whitespace-nowrap transition-all duration-300 ${
              isSidebarHovered ? 'opacity-100 delay-75' : 'opacity-0 absolute'
            }`}>
            </h1>
            <h1 className={`text-2xl font-bold text-primary-600 text-center transition-all duration-300 ${
              !isSidebarHovered ? 'opacity-100 delay-75' : 'opacity-0 absolute'
            }`}>
              PM
            </h1>
          </div>
          <p className={`text-sm text-gray-500 mt-1 whitespace-nowrap transition-all duration-300 ${
            isSidebarHovered ? 'opacity-100 delay-100' : 'opacity-0 h-0'
          }`}>
            Sistema de Monitoramento
          </p>
        </div>
        
        <nav className="p-4 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center rounded-lg mb-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${isSidebarHovered ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'}`
              }
              title={!isSidebarHovered ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isSidebarHovered ? 'opacity-100 max-w-xs delay-75' : 'opacity-0 max-w-0'
              }`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t">
          <div className={`mb-3 ${isSidebarHovered ? 'px-2' : 'text-center'}`}>
            <div className={`text-sm font-medium text-gray-900 truncate ${!isSidebarHovered && 'hidden'}`}>
              {user?.full_name || user?.username}
            </div>
            <div className={`text-xs text-gray-500 truncate ${!isSidebarHovered && 'hidden'}`}>
              {isAdmin ? 'Administrador' : 'Usuário'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300 w-full ${
              isSidebarHovered ? 'gap-3 px-4 py-2' : 'justify-center px-3 py-2'
            }`}
            title={!isSidebarHovered ? 'Sair' : ''}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarHovered ? 'opacity-100 max-w-xs delay-75' : 'opacity-0 max-w-0'
            }`}>
              Sair
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content - margem fixa */}
      <main className="ml-20 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
