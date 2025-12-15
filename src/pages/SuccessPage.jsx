import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { sendEmail, getItinerary, unlockItinerary } from '../services/api';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailSent, setEmailSent] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  
  // Extract form data from URL params
  const itineraryId = searchParams.get('itineraryId') || '';
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || [],
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '800',
    email: searchParams.get('email') || '',
    session_id: searchParams.get('session_id') || ''
  };

  useEffect(() => {
    if (itineraryId && formData.email && !emailSent) {
      sendEmailWithItinerary();
    }
  }, [itineraryId, formData.email, emailSent]);

  const sendEmailWithItinerary = async () => {
    try {
      console.log('📧 Completing itinerary and sending email...');
      console.log('📋 Itinerary ID:', itineraryId);
      console.log('📋 Form Data:', formData);
      
      // NEW APPROACH: Simply unlock the itinerary (set previewOnly to false)
      // The full plan was already generated and saved during preview
      console.log('🔓 Unlocking itinerary...');
      const unlockResult = await unlockItinerary(itineraryId);
      
      if (unlockResult && unlockResult.success && unlockResult.itinerary) {
        console.log('✅ Itinerary unlocked:', unlockResult.itinerary);
        console.log('📊 Full plan activities count:', unlockResult.itinerary.activities?.length || 0);
        console.log('📊 Full plan blocks count:', unlockResult.itinerary.daily_plan?.[0]?.blocks?.length || 0);
        console.log('📊 PreviewOnly flag:', unlockResult.itinerary.previewOnly);
        setItinerary(unlockResult.itinerary);
        
        // Wait a bit to ensure Redis has saved the data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify the itinerary is unlocked in Redis
        console.log('🔍 Verifying itinerary is unlocked in Redis...');
        let verificationAttempts = 0;
        let verified = false;
        while (verificationAttempts < 3 && !verified) {
          const verifyData = await getItinerary(itineraryId);
          if (verifyData && verifyData.success && verifyData.itinerary) {
            const blocksCount = verifyData.itinerary.daily_plan?.[0]?.blocks?.length || 0;
            const isUnlocked = verifyData.itinerary.previewOnly === false;
            console.log(`🔍 Verification attempt ${verificationAttempts + 1}: ${blocksCount} blocks, unlocked: ${isUnlocked}`);
            if (isUnlocked && blocksCount > 2) {
              verified = true;
              console.log('✅ Itinerary verified as unlocked in Redis');
            }
          }
          if (!verified) {
            verificationAttempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Step 2: Send the email with the full itinerary
        if (formData.email) {
          console.log('📧 Sending email...');
          const emailResult = await sendEmail({
            email: formData.email,
            itinerary: unlockResult.itinerary,
            formData: formData,
            itineraryId: itineraryId
          });

          console.log('📧 Email result:', emailResult);
          setEmailSent(true);
        }
      } else {
        console.warn('⚠️ Could not unlock itinerary, trying to load existing...');
        // Fallback: try to load existing itinerary
        const itineraryData = await getItinerary(itineraryId);
        if (itineraryData && itineraryData.success && itineraryData.itinerary) {
          setItinerary(itineraryData.itinerary);
          if (formData.email) {
            await sendEmail({
              email: formData.email,
              itinerary: itineraryData.itinerary,
              formData: formData,
              itineraryId: itineraryId
            });
            setEmailSent(true);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in sendEmailWithItinerary:', error);
      // Set a fallback itinerary so the page still works
      setItinerary({
        title: `Exploring ${formData.city}`,
        subtitle: 'Your adventure awaits!',
        activities: []
      });
    }
  };

  const handleOpenPlan = () => {
    const queryParams = new URLSearchParams();
    queryParams.set('city', formData.city);
    queryParams.set('audience', formData.audience);
    queryParams.set('interests', Array.isArray(formData.interests) ? formData.interests.join(',') : formData.interests);
    queryParams.set('date', formData.date);
    queryParams.set('budget', formData.budget);
    // CRITICAL: Add itineraryId to load the full plan from Redis
    if (itineraryId) {
      queryParams.set('itineraryId', itineraryId);
    }
    // Add full=true to indicate this is a full plan (not preview)
    queryParams.set('full', 'true');
    // Remove previewOnly if present
    queryParams.delete('previewOnly');
    // Force reload to get fresh data from Redis
    window.location.href = `/itinerary?${queryParams.toString()}`;
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
          {emailSent 
            ? `Thank you! We've sent your ${formData.city} itinerary to ${formData.email}. Check your inbox!`
            : `Your personalized ${formData.city} plan is ready! We're sending it to your email...`
          }
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
            An email with a link to the plan has been sent to your email
          </div>
        </div>
      </div>
    </div>
  );
}