import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AssetGallery = ({ assets }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [mainApi, setMainApi] = useState(null);
  const [thumbApi, setThumbApi] = useState(null);

  const [mainRef, mainApiInternal] = useEmblaCarousel({ loop: true });
  const [thumbRef, thumbApiInternal] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
  });

  useEffect(() => {
    setMainApi(mainApiInternal);
    setThumbApi(thumbApiInternal);
  }, [mainApiInternal, thumbApiInternal]);

  const openViewer = useCallback(() => {
    setViewerOpen(true);
  }, []);

  const onThumbClick = useCallback(
    (index) => {
      if (!mainApi || !thumbApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi, thumbApi]
  );

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbApi) return;
    setSelectedIndex(mainApi.selectedScrollSnap());
    thumbApi.scrollTo(mainApi.selectedScrollSnap());
  }, [mainApi, thumbApi, setSelectedIndex]);

  useEffect(() => {
    if (!mainApi) return;
    onSelect();
    mainApi.on('select', onSelect);
    mainApi.on('reInit', onSelect);
  }, [mainApi, onSelect]);

  const scrollPrev = useCallback(() => mainApi && mainApi.scrollPrev(), [mainApi]);
  const scrollNext = useCallback(() => mainApi && mainApi.scrollNext(), [mainApi]);

  useEffect(() => {
    if (!viewerOpen || !mainApi) return;
    mainApi.scrollTo(selectedIndex);
  }, [viewerOpen, mainApi, selectedIndex]);

  const isVideoAsset = useCallback((asset) => {
    if (asset?.asset_type === 'video') return true;
    const url = asset?.asset_url || '';
    return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
  }, []);

  const gridAssets = useMemo(() => assets || [], [assets]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex h-full flex-col gap-4 p-6">
        <button
          type="button"
          onClick={openViewer}
          className="group relative w-full flex-1 min-h-0 overflow-hidden rounded-3xl bg-gray-200 shadow-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {gridAssets[selectedIndex] && isVideoAsset(gridAssets[selectedIndex]) ? (
            <video
              src={gridAssets[selectedIndex].asset_url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={gridAssets[selectedIndex]?.asset_url}
              className="h-full w-full object-cover"
              alt={`Asset ${selectedIndex + 1}`}
            />
          )}
        </button>

        <div className="mt-auto flex gap-4 overflow-x-auto pb-2 pt-2 min-h-[88px] flex-shrink-0">
          {gridAssets.map((asset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                index === selectedIndex ? 'border-indigo-500' : 'border-transparent'
              }`}
            >
              {isVideoAsset(asset) ? (
                <video
                  src={asset.asset_url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <img src={asset.asset_url} className="h-full w-full object-cover" alt={`Thumbnail ${index + 1}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur"
            onClick={() => setViewerOpen(false)}
          />
          <div className="relative z-10 w-[92vw] max-w-5xl h-[82vh] bg-black/70 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="relative flex-grow overflow-hidden" ref={mainRef}>
              <div className="flex h-full">
                {gridAssets.map((asset, index) => (
                  <div className="flex-[0_0_100%] h-full flex items-center justify-center" key={index}>
                    {isVideoAsset(asset) ? (
                      <video
                        src={asset.asset_url}
                        className="max-h-full max-w-full object-contain"
                        controls
                      />
                    ) : (
                      <img
                        src={asset.asset_url}
                        className="max-h-full max-w-full object-contain"
                        alt={`Asset ${index + 1}`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={scrollPrev}
                className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/20 text-white p-2 rounded-full hover:bg-white/40 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={scrollNext}
                className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 text-white p-2 rounded-full hover:bg-white/40 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="absolute top-4 right-4 bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/40 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="py-4 px-6 bg-black/70" ref={thumbRef}>
              <div className="flex gap-3">
                {gridAssets.map((asset, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => onThumbClick(index)}
                    className={`flex-[0_0_16%] rounded-lg overflow-hidden border-2 ${
                      index === selectedIndex ? 'border-indigo-400' : 'border-transparent'
                    }`}
                  >
                    {isVideoAsset(asset) ? (
                      <video src={asset.asset_url} className="h-16 w-full object-cover" muted playsInline />
                    ) : (
                      <img src={asset.asset_url} className="h-16 w-full object-cover" alt={`Thumbnail ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetGallery;
