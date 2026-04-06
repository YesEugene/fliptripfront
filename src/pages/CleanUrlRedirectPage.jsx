import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ItineraryPage from './ItineraryPage';
import NotFoundPage from './NotFoundPage';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app/api';

export default function CleanUrlRedirectPage() {
  const navigate = useNavigate();
  const { city, slug } = useParams();
  const [searchParams] = useSearchParams();
  const [resolvedTourId, setResolvedTourId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPaid = searchParams.get('paid') === 'true';

  useEffect(() => {
    const cleanPath = `/tours/${city}/${slug}`;
    const baseUrl = API_BASE.replace(/\/api\/?$/, '');

    setLoading(true);
    fetch(`${baseUrl}/api/tours?status=approved&limit=50&summary=1`)
      .then(r => r.json())
      .then(data => {
        const tours = Array.isArray(data?.tours) ? data.tours : [];
        const matched = tours.find(t => t?.draft_data?.seo?.cleanUrl === cleanPath);
        if (matched) {
          setResolvedTourId(matched.id);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [city, slug, navigate]);

  if (loading) return null;

  if (notFound) return <NotFoundPage />;

  return <ItineraryPage cleanUrlTourId={resolvedTourId} cleanUrlPreviewOnly={!isPaid} />;
}
