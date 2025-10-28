import React, { useState, useEffect } from 'react';
import { telegramAlertService } from '../services/telegramService';

const Settings: React.FC = () => {
  const [threshold, setThreshold] = useState<string>('1.0');
  const [savedThreshold, setSavedThreshold] = useState<string>('1.0');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Auto-detect API URL based on environment
  const getApiUrl = () => {
    // Priority 1: Environment variable
    if (process.env.REACT_APP_TELEGRAM_API_URL) {
      return process.env.REACT_APP_TELEGRAM_API_URL.replace('/api/price-alert', '');
    }
    // Priority 2: Production environment (not localhost)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://telegram-alert-service.352848845.workers.dev';
    }
    // Priority 3: Local development
    return 'http://localhost:3001';
  };
  
  const API_URL = getApiUrl();

  // Load saved threshold from backend on mount
  useEffect(() => {
    const loadThreshold = async () => {
      try {
        const response = await fetch(`${API_URL}/api/threshold`);
        const data = await response.json();
        const value = data.threshold || 1.0;
        setThreshold(value.toString());
        setSavedThreshold(value.toString());
        
        // Also save to localStorage for backward compatibility
        localStorage.setItem('alertThreshold', value.toString());
        telegramAlertService.setAlertThreshold(value);
      } catch (error) {
        console.error('Failed to load threshold:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('alertThreshold');
        if (saved) {
          const value = parseFloat(saved);
          setThreshold(value.toString());
          setSavedThreshold(value.toString());
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThreshold();
  }, [API_URL]);

  const handleSave = async () => {
    const numValue = parseFloat(threshold);
    
    // Validate
    if (isNaN(numValue) || numValue <= 0 || numValue > 100) {
      setSaveMessage('❌ 请输入有效的百分比值（0-100之间）');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to backend
      const response = await fetch(`${API_URL}/api/threshold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold: numValue }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save threshold');
      }
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('alertThreshold', numValue.toString());
      
      // Update the telegram service threshold
      telegramAlertService.setAlertThreshold(numValue);
      
      setSavedThreshold(numValue.toString());
      setSaveMessage('✅ 保存成功！新阈值已生效（已保存到服务器）');
    } catch (error) {
      console.error('Failed to save threshold:', error);
      setSaveMessage('❌ 保存失败，请检查网络连接');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleReset = async () => {
    try {
      // Save to backend
      await fetch(`${API_URL}/api/threshold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold: 1.0 }),
      });
      
      setThreshold('1.0');
      setSavedThreshold('1.0');
      localStorage.setItem('alertThreshold', '1.0');
      telegramAlertService.setAlertThreshold(1.0);
      setSaveMessage('✅ 已重置为默认值 1%（已保存到服务器）');
    } catch (error) {
      setSaveMessage('❌ 重置失败');
    } finally {
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const presetValues = [
    { label: '0.5%', value: '0.5' },
    { label: '1%', value: '1.0' },
    { label: '2%', value: '2.0' },
    { label: '3%', value: '3.0' },
    { label: '5%', value: '5.0' },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载设置中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">设置</h1>

        {/* Alert Threshold Setting */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📢 价差告警阈值
          </h2>
          
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-4">
              当 Hyperliquid 和币安的价格差异超过此阈值时，将发送 Telegram 告警通知。
            </p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  告警阈值（百分比）
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：1.0"
                  />
                  <span className="text-gray-600 font-medium">%</span>
                </div>
              </div>
            </div>

            {/* Preset Values */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                快速选择
              </label>
              <div className="flex flex-wrap gap-2">
                {presetValues.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setThreshold(preset.value)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      threshold === preset.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                saveMessage.includes('❌') 
                  ? 'bg-red-50 text-red-700' 
                  : 'bg-green-50 text-green-700'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isSaving ? '保存中...' : '保存设置'}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                重置为默认
              </button>
            </div>
          </div>

          {/* Current Status */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">当前生效阈值</p>
                <p className="text-2xl font-bold text-blue-600">
                  {savedThreshold}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">告警状态</p>
                <p className="text-sm font-medium text-green-600">
                  ✓ 已启用
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 阈值设置后会立即生效，无需刷新页面</li>
            <li>• 建议阈值范围：0.5% - 5%</li>
            <li>• 阈值越小，告警越频繁</li>
            <li>• 每个交易对每 5 分钟最多发送一次告警（防止刷屏）</li>
            <li>• <strong>设置会保存到服务器，任何设备都可以访问</strong></li>
            <li>• 浏览器关闭后设置不会丢失</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;
