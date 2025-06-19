
import React, { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [slidesCount, setSlidesCount] = useState(0);
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return null;
  }

  // Calculer le nombre réel d'éléments par vue selon l'écran
  const getActualItemsPerView = () => {
    if (isMobile) return 1;
    if (window.innerWidth < 768) return 1; // md breakpoint
    if (window.innerWidth < 1024) return 2; // lg breakpoint
    return 3;
  };

  // Effet pour gérer les changements d'éléments et repositionner le carousel
  useEffect(() => {
    if (!api) return;

    const actualItemsPerView = getActualItemsPerView();
    const totalSlides = Math.ceil(items.length / actualItemsPerView);
    setSlidesCount(totalSlides);

    // Calculer la nouvelle position optimale
    let newPosition = current;

    // Si la position actuelle dépasse le nombre total de slides possibles
    if (current >= totalSlides) {
      newPosition = Math.max(0, totalSlides - 1);
    }

    // Repositionner le carousel si nécessaire
    if (newPosition !== current) {
      api.scrollTo(newPosition);
      setCurrent(newPosition);
    } else {
      // Réinitialiser le carousel pour qu'il recalcule ses positions
      api.reInit();
    }
  }, [items.length, api, current]);

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

  // Mettre à jour le nombre de slides lors du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (api) {
        const actualItemsPerView = getActualItemsPerView();
        const totalSlides = Math.ceil(items.length / actualItemsPerView);
        setSlidesCount(totalSlides);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Calcul initial

    return () => window.removeEventListener('resize', handleResize);
  }, [api, items.length]);

  const canShowNavigation = items.length > getActualItemsPerView();

  return (
    <div className={`relative select-none ${className}`}>
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
              className={`pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3 select-none`}
            >
              <div className="select-none">
                {item}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      
      {/* Points de navigation - un point par page */}
      {canShowNavigation && slidesCount > 1 && (
        <div className="flex justify-center mt-4 space-x-2 select-none">
          {Array.from({ length: slidesCount }, (_, pageIndex) => (
            <button
              key={pageIndex}
              onClick={() => api?.scrollTo(pageIndex)}
              className={`w-2 h-2 rounded-full transition-all duration-200 select-none ${
                pageIndex === current
                  ? 'bg-gray-300 opacity-100' 
                  : 'bg-gray-400 opacity-50 hover:opacity-70'
              }`}
              style={{ userSelect: 'none' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
