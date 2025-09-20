import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { generateSmartItinerary, sendEmail } from '../services/api';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailSent, setEmailSent] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  
  // Extract form data from URL params
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || [],
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '800',
    email: searchParams.get('email') || '',
    session_id: searchParams.get('session_id') || ''
  };

  // НЕ вызываем API на success странице - это делает ее быстрой и надежной
  // Email будет отправлен на странице итинерария
  useEffect(() => {
    // Просто показываем success без API вызовов
    setEmailSent(false); // Email будет отправлен позже
  }, []);

  const sendEmailWithItinerary = async () => {
    try {
      console.log('🌍 Generating real places itinerary for success page...');
      
      // First, generate the smart itinerary
      const itineraryData = await generateSmartItinerary({
        city: formData.city,
        audience: formData.audience,
        interests: formData.interests,
        budget: formData.budget,
        date: formData.date
      });

      console.log('✅ Real places itinerary generated:', itineraryData);
      setItinerary(itineraryData);

      // Then send the email
      if (formData.email) {
        const emailResult = await sendEmail({
          email: formData.email,
          itinerary: itineraryData,
          formData: formData
        });

        console.log('📧 Email result:', emailResult);
        setEmailSent(true);
      }
    } catch (error) {
      console.error('Error in sendEmailWithItinerary:', error);
      // Set a fallback itinerary so the page still works
      setItinerary({
        title: `Exploring ${formData.city}`,
        subtitle: 'Your adventure awaits!',
        activities: []
      });
    }
  };

  const handleOpenPlan = () => {
    const queryParams = new URLSearchParams(formData);
    navigate(`/itinerary?${queryParams.toString()}`);
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#374151',
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  };

  const logoStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#e11d48',
    marginBottom: '8px'
  };

  const taglineStyle = {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '24px'
  };

  const successIconStyle = {
    fontSize: '48px',
    marginBottom: '16px'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: '12px'
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '24px',
    lineHeight: '1.4'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#e11d48',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px'
  };

  const infoStyle = {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#6b7280'
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white', 
      margin: 0, 
      padding: 0, 
      position: 'relative',
      maxWidth: '750px',
      marginLeft: 'auto',
      marginRight: 'auto'
    }}>
      {/* Header with Logo */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        maxWidth: '750px',
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* Centered Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <img 
            src={FlipTripLogo} 
            alt="FlipTrip" 
            style={{ 
              height: '57px',
              width: '435px'
            }}
          />
        </div>
      </div>

      {/* Success Card */}
      <div style={{
        width: '100%',
        maxWidth: '750px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: 'none',
        marginTop: '20px',
        position: 'relative',
        zIndex: 10,
        padding: '32px',
        margin: '20px auto 0',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#059669',
          marginBottom: '12px'
        }}>
          Payment successful!
        </h1>
        
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          {`Thank you! Your personalized ${formData.city} plan is being prepared. Click below to view your itinerary and we'll send it to ${formData.email || 'your email'}.`}
        </p>

        <button
          onClick={handleOpenPlan}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#3E85FC',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            marginBottom: '24px'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#3E85FC';
          }}
        >
          🚀 Open my plan
        </button>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'left'
        }}>
          <div><strong>City:</strong> {formData.city}</div>
          <div><strong>Date:</strong> {formData.date}</div>
          <div><strong>Interests:</strong> {formData.interests.join(', ')}</div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            Click "Open my plan" to view your itinerary and receive it by email
          </div>
        </div>
      </div>
    </div>
  );
}