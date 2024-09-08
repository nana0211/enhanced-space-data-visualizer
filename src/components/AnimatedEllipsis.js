import React, { useState, useEffect } from 'react';

const AnimatedEllipsis = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prevDots => {
        switch (prevDots) {
          case '':
            return '.';
          case '.':
            return '..';
          case '..':
            return '...';
          default:
            return '';
        }
      });
    }, 500); // Change dots every 500ms

    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
};

export default AnimatedEllipsis;