
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
  const [totalPages, setTotalPages] = useState(0);
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return null;
  }

  // Calculer le nombre réel d'éléments par vue selon l'écran
  const getActualItemsPerView = () => {
    if (isMobile) return 1;
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 1; // mobile
      if (window.innerWidth < 1024) return 2; // tablet
    }
    return 3; // desktop
  };

  // Calculer le nombre total de pages basé sur le comportement réel d'Embla
  const calculateTotalPages = () => {
    if (!api) return 0;
    
    // Utiliser directement la méthode d'Embla pour obtenir le nombre de slides
    const scrollSnaps = api.scrollSnapList();
    const pages = scrollSnaps.length;
    
    console.log(`Carousel: ${items.length} items, ${getActualItemsPerView()} per view, ${pages} pages (via Embla)`);
    return pages;
  };

  // Effet pour suivre l'item actuel et calculer les pages
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      
      // Recalculer les pages à chaque sélection
      const pages = calculateTotalPages();
      setTotalPages(pages);
    };

    api.on('select', onSelect);
    api.on('reInit', onSelect);
    onSelect(); // Initialiser

    return () => {
      api?.off('select', onSelect);
      api?.off('reInit', onSelect);
    };
  }, [api]);

  // Effet pour gérer les changements d'éléments
  useEffect(() => {
    if (!api) return;

    // Réinitialiser le carousel pour qu'il recalcule ses positions
    api.reInit();
    
    // Recalculer les pages après réinitialisation
    setTimeout(() => {
      const pages = calculateTotalPages();
      setTotalPages(pages);
      
      // Si la position actuelle dépasse le nombre total de pages possibles
      if (current >= pages) {
        const newPosition = Math.max(0, pages - 1);
        api.scrollTo(newPosition);
        setCurrent(newPosition);
      }
    }, 0);
  }, [items.length]);

  // Mettre à jour lors du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (!api) return;
      
      // Réinitialiser le carousel
      api.reInit();
      
      // Recalculer les pages après réinitialisation
      setTimeout(() => {
        const pages = calculateTotalPages();
        setTotalPages(pages);
        
        // Ajuster la position actuelle si nécessaire
        if (current >= pages) {
          const newPosition = Math.max(0, pages - 1);
          api.scrollTo(newPosition);
          setCurrent(newPosition);
        }
      }, 0);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [api, current]);

  const actualItemsPerView = getActualItemsPerView();
  const canShowNavigation = items.length > actualItemsPerView;

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
      
      {/* Points de navigation - basés sur les snap points d'Embla */}
      {canShowNavigation && totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2 select-none">
          {Array.from({ length: totalPages }, (_, pageIndex) => (
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
