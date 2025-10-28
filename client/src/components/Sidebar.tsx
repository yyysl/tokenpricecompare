import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: '价格对比', href: '/price-comparison', icon: ChartBarIcon },
    { name: '资金费率', href: '/funding', icon: ChartBarIcon },
    { name: '设置', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Trade on Hyper</h1>
      </div>
      <nav className="px-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;

