import React, { memo } from 'react';
import logoUrl from '../assets/logo.svg';

export const AgentLogo = memo(function AgentLogo({ size = 28 }) {
  return (
    <img src={logoUrl} width={size} height={size} alt="Agent Logo" />
  );
});

export const AiAvatar = memo(function AiAvatar({ size = 24 }) {
  return (
    <img src={logoUrl} width={size} height={size} alt="AI Avatar" />
  );
});
