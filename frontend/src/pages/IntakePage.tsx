import React from 'react';
import { Navigate } from 'react-router-dom';

export const IntakePage: React.FC = () => {
  return <Navigate to="/citizen/new" replace />;
};

export default IntakePage;
