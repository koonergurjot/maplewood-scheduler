import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ 
  title, 
  description, 
  icon = "📋", 
  action, 
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <div className="text-4xl mb-4" role="img" aria-label="Empty state icon">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      {action && (
        <button 
          onClick={action.onClick}
          className="btn"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}