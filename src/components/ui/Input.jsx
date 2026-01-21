import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef(({
    label,
    error,
    className,
    uppercase, // New prop to enforce uppercase
    onChange,
    ...props
}, ref) => {

    const handleChange = (e) => {
        if (uppercase && e.target.value) {
            e.target.value = e.target.value.toUpperCase();
        }
        if (onChange) onChange(e);
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={twMerge(clsx(
                    "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all",
                    error ? "border-red-300 focus:ring-red-200" : "border-slate-300",
                    uppercase && "uppercase placeholder:normal-case",
                    className
                ))}
                onChange={handleChange}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';
