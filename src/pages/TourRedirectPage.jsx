import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { extractTourIdFromSlug } from '../utils/tourSlug';
import NotFoundPage from './NotFoundPage';

export default function TourRedirectPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const tourId = extractTourIdFromSlug(slug);
    if (!tourId) {
      setNotFound(true);
      return;
    }

    const params = new URLSearchParams();
    params.set('tourId', tourId);
    params.set('previewOnly', 'true');
    navigate(`/itinerary?${params.toString()}`, { replace: true });
  }, [slug, navigate]);

  if (notFound) return <NotFoundPage />;

  return null;
}
