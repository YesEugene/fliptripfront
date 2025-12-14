/**
 * CreateTourPage - Страница создания тура для гидов
 * Модуль: guide-dashboard
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTour } from '../../tours-database';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function CreateTourPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    city: '',
    duration: {
      type: 'hours',
      value: 6
    },
    languages: ['en'],
    format: 'self-guided',
    price: {
      amount: 0,
      currency: 'EUR',
      format: 'pdf'
    },
    daily_plan: [
      {
        day: 1,
        date: new Date().toISOString().slice(0, 10),
        blocks: [
          {
            time: '09:00 - 12:00',
            items: []
          }
        ]
      }
    ],
    meta: {
      interests: [],
      audience: 'him',
      total_estimated_cost: '€0'
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createTour(formData);
      if (result.success) {
        navigate('/guide/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Ошибка создания тура');
    } finally {
      setLoading(false);
    }
  };

  const addDay = () => {
    setFormData(prev => ({
      ...prev,
      daily_plan: [
        ...prev.daily_plan,
        {
          day: prev.daily_plan.length + 1,
          date: new Date().toISOString().slice(0, 10),
          blocks: [
            {
              time: '09:00 - 12:00',
              items: []
            }
          ]
        }
      ]
    }));
  };

  const addBlock = (dayIndex) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      newPlan[dayIndex].blocks.push({
        time: '12:00 - 15:00',
        items: []
      });
      return { ...prev, daily_plan: newPlan };
    });
  };

  const addItem = (dayIndex, blockIndex) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      newPlan[dayIndex].blocks[blockIndex].items.push({
        title: '',
        address: '',
        description: '',
        category: '',
        duration: '',
        approx_cost: ''
      });
      return { ...prev, daily_plan: newPlan };
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          <button
            onClick={() => navigate('/guide/dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
          Создать новый тур
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Основная информация */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              Основная информация
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Название тура *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Город *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '20px', 
              marginBottom: '20px' 
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Длительность
                </label>
                <select
                  value={formData.duration.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    duration: { ...formData.duration, type: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  <option value="hours">Часы</option>
                  <option value="days">Дни</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Значение
                </label>
                <input
                  type="number"
                  value={formData.duration.value}
                  onChange={(e) => setFormData({
                    ...formData,
                    duration: { ...formData.duration, value: parseInt(e.target.value) }
                  })}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Формат тура
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="self-guided">Самостоятельно</option>
                <option value="guided">С гидом</option>
                <option value="food">Еда</option>
                <option value="car">На автомобиле</option>
              </select>
            </div>
          </div>

          {/* План по дням */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                План по дням
              </h2>
              <button
                type="button"
                onClick={addDay}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                + Добавить день
              </button>
            </div>

            {formData.daily_plan.map((day, dayIndex) => (
              <div key={dayIndex} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                  День {day.day}
                </h3>

                {day.blocks.map((block, blockIndex) => (
                  <div key={blockIndex} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <input
                      type="text"
                      value={block.time}
                      onChange={(e) => {
                        const newPlan = [...formData.daily_plan];
                        newPlan[dayIndex].blocks[blockIndex].time = e.target.value;
                        setFormData({ ...formData, daily_plan: newPlan });
                      }}
                      placeholder="09:00 - 12:00"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        fontWeight: '600'
                      }}
                    />
                    
                    {/* Локации в блоке */}
                    {block.items && block.items.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {block.items.map((item, itemIndex) => (
                          <div key={itemIndex} style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: '#f9fafb'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong style={{ fontSize: '14px' }}>Локация {itemIndex + 1}</strong>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items.splice(itemIndex, 1);
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                            
                            <input
                              type="text"
                              value={item.title || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.daily_plan];
                                newPlan[dayIndex].blocks[blockIndex].items[itemIndex].title = e.target.value;
                                setFormData({ ...formData, daily_plan: newPlan });
                              }}
                              placeholder="Название локации *"
                              required
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px'
                              }}
                            />
                            
                            <input
                              type="text"
                              value={item.address || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.daily_plan];
                                newPlan[dayIndex].blocks[blockIndex].items[itemIndex].address = e.target.value;
                                setFormData({ ...formData, daily_plan: newPlan });
                              }}
                              placeholder="Адрес"
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px'
                              }}
                            />
                            
                            <textarea
                              value={item.description || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.daily_plan];
                                newPlan[dayIndex].blocks[blockIndex].items[itemIndex].description = e.target.value;
                                setFormData({ ...formData, daily_plan: newPlan });
                              }}
                              placeholder="Описание локации"
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px',
                                resize: 'vertical'
                              }}
                            />
                            
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', 
                              gap: '8px' 
                            }}>
                              <input
                                type="text"
                                value={item.category || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].category = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Категория"
                                style={{
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  width: '100%'
                                }}
                              />
                              <input
                                type="text"
                                value={item.duration || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].duration = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Длительность"
                                style={{
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  width: '100%'
                                }}
                              />
                              <input
                                type="text"
                                value={item.approx_cost || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].approx_cost = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Примерная стоимость"
                                style={{
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  width: '100%'
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => addItem(dayIndex, blockIndex)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      + Добавить локацию
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addBlock(dayIndex)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  + Добавить блок времени
                </button>
              </div>
            ))}
          </div>

          {/* Кнопка сохранения */}
          <div style={{ marginBottom: '32px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Создание тура...' : 'Создать тур'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

