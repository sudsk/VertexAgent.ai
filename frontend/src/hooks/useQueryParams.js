// src/hooks/useQueryParams.js
import { useLocation, useNavigate } from 'react-router-dom';

export default function useQueryParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const getQueryParam = (key) => {
    return queryParams.get(key);
  };
  
  const setQueryParam = (key, value) => {
    if (value === null || value === undefined || value === '') {
      queryParams.delete(key);
    } else {
      queryParams.set(key, value);
    }
    
    navigate({
      pathname: location.pathname,
      search: queryParams.toString()
    });
  };
  
  const removeQueryParam = (key) => {
    queryParams.delete(key);
    
    navigate({
      pathname: location.pathname,
      search: queryParams.toString()
    });
  };
  
  return { getQueryParam, setQueryParam, removeQueryParam };
}
