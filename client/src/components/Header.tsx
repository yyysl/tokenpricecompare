import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">交易平台</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">欢迎使用</span>
        </div>
      </div>
    </header>
  );
};

export default Header;

