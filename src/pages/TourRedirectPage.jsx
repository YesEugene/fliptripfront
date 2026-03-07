import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { extractTourIdFromSlug } from '../utils/tourSlug';

export default function TourRedirectPage() {
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    const tourId = extractTourIdFromSlug(slug);
    if (!tourId) {
      navigate('/explore', { replace: true });
      return;
    }

    const params = new URLSearchParams();
    params.set('tourId', tourId);
    params.set('previewOnly', 'true');
    navigate(`/itinerary?${params.toString()}`, { replace: true });
  }, [slug, navigate]);

  return null;
}
