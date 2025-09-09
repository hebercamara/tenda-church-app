import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const LoadingMessage = ({ state, message, className = '' }) => {
    if (!state || state === 'idle') return null;

    const getIcon = () => {
        switch (state) {
            case 'loading':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'success':
                return <CheckCircle className="w-4 h-4" />;
            case 'error':
                return <XCircle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const getStyles = () => {
        switch (state) {
            case 'loading':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'success':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'error':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return '';
        }
    };

    return (
        <div className={`flex items-center gap-2 p-3 rounded-md border ${getStyles()} ${className}`}>
            {getIcon()}
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
};

export default LoadingMessage;