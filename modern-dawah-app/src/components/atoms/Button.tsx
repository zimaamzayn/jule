import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-[#D4AF37] text-black hover:bg-[#B3932F] focus:ring-[#D4AF37]",
    secondary: "bg-[#F9FAFB] text-[#030712] hover:bg-gray-200 focus:ring-gray-300",
    outline: "border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black focus:ring-[#D4AF37]"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2 text-base",
    lg: "px-8 py-3 text-lg"
  };

  const classes = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className || ''}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
