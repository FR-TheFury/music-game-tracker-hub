
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
  itemsPerView?: number;
  hideSideArrows?: boolean;
}

export const CarouselGrid: React.FC<CarouselGridProps> = ({ 
  items, 
  className = '', 
  itemsPerView = 3,
  hideSideArrows = true
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  if (items.length === 0) {
    return null;
  }

  // Effet pour gérer les changements d'éléments et repositionner le carousel
  useEffect(() => {
    if (!api) return;

    // Calculer la nouvelle position optimale
    const totalPositions = Math.max(1, items.length - itemsPerView + 1);
    let newPosition = current;

    // Si la position actuelle dépasse le nombre total de positions possibles
    if (current >= totalPositions) {
      newPosition = Math.max(0, totalPositions - 1);
    }

    // Si on est à la fin et qu'il y a encore assez d'éléments pour remplir la vue
    if (current > 0 && items.length >= itemsPerView) {
      const itemsAfterCurrent = items.length - (current * itemsPerView);
      if (itemsAfterCurrent < itemsPerView && totalPositions > 1) {
        newPosition = Math.max(0, totalPositions - 1);
      }
    }

    // Repositionner le carousel si nécessaire
    if (newPosition !== current) {
      api.scrollTo(newPosition);
      setCurrent(newPosition);
    } else {
      // Réinitialiser le carousel pour qu'il recalcule ses positions
      api.reInit();
    }
  }, [items.length, api, current, itemsPerView]);

  // Effet pour suivre l'item actuel
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

  // Calculer le nombre total de positions possibles
  const totalPositions = Math.max(1, items.length - itemsPerView + 1);
  const canShowNavigation = items.length > itemsPerView;

  return (
    <div className={`relative ${className}`}>
      <Carousel 
        className="w-full" 
        setApi={setApi}
        opts={{
          align: "start",
          slidesToScroll: 1,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {items.map((item, index) => (
            <CarouselItem 
              key={index} 
              className={`pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3`}
            >
              {item}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      
      {/* Points de navigation */}
      {canShowNavigation && totalPositions > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: totalPositions }, (_, index) => (
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
