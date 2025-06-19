
import React, { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
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
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  if (items.length === 0) {
    return null;
  }

  // Grouper les éléments par slides
  const slides = [];
  for (let i = 0; i < items.length; i += itemsPerSlide) {
    slides.push(items.slice(i, i + itemsPerSlide));
  }

  // Effet pour gérer les changements d'éléments
  useEffect(() => {
    if (!api) return;

    // Si le slide actuel n'existe plus après suppression, aller au dernier slide disponible
    if (current >= slides.length && slides.length > 0) {
      api.scrollTo(slides.length - 1);
    }

    // Réinitialiser le carousel pour qu'il recalcule ses positions
    api.reInit();
  }, [items.length, api, current, slides.length]);

  // Effet pour suivre le slide actuel
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    onSelect(); // Initialiser

    return () => {
      api?.off('select', onSelect);
    };
  }, [api]);

  return (
    <div className={`relative ${className}`}>
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {slides.map((slideItems, slideIndex) => (
            <CarouselItem key={`slide-${slideIndex}-${slideItems.length}`}>
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
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === current 
                  ? 'bg-gray-300 opacity-100' 
                  : 'bg-gray-400 opacity-50 hover:opacity-70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
