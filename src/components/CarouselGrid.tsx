
import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface CarouselGridProps {
  items: React.ReactNode[];
  className?: string;
  itemsPerSlide?: number;
}

export const CarouselGrid: React.FC<CarouselGridProps> = ({ 
  items, 
  className = '', 
  itemsPerSlide = 3 
}) => {
  if (items.length === 0) {
    return null;
  }

  // Grouper les éléments par slides
  const slides = [];
  for (let i = 0; i < items.length; i += itemsPerSlide) {
    slides.push(items.slice(i, i + itemsPerSlide));
  }

  return (
    <div className={`relative ${className}`}>
      <Carousel className="w-full">
        <CarouselContent>
          {slides.map((slideItems, slideIndex) => (
            <CarouselItem key={slideIndex}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slideItems}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-0 -translate-x-full" />
            <CarouselNext className="right-0 translate-x-full" />
          </>
        )}
      </Carousel>
      
      {slides.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-gray-400 opacity-50"
            />
          ))}
        </div>
      )}
    </div>
  );
};
