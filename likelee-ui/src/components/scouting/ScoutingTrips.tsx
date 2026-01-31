import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Cloud,
  ChevronDown,
  ChevronUp,
  MapPin,
  Camera,
  FileText,
  Star,
  Plus,
  ArrowUpRight,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoutingTrip, ScoutingTripLocation } from "@/types/scouting";
import { PlanTripModal } from "./map/PlanTripModal";
import { TripAnalytics } from "./TripAnalytics";
import { scoutingService } from "@/services/scoutingService";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const PhotoLightbox = ({
  photos,
  initialIndex,
  isOpen,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-none text-white overflow-hidden">
        <div className="relative w-full h-[80vh] flex items-center justify-center group">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
                onClick={handlePrevious}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
                onClick={handleNext}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          <div className="relative w-full h-full flex items-center justify-center p-8">
            <img
              src={photos[currentIndex]}
              alt={`Photo ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm font-medium text-white/80 bg-black/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TripCard = ({
  trip,
  onEdit,
}: {
  trip: ScoutingTrip;
  onEdit: (trip: ScoutingTrip) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return "";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const startStr = startDate.toLocaleDateString("en-US", options);

    if (!endDate) return startStr;

    const endStr = endDate.toLocaleDateString("en-US", options);
    const year = startDate.getFullYear();

    return `${startStr} - ${endStr}, ${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "ongoing":
        return "bg-blue-100 text-blue-700";
      case "planned":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const openLightbox = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Card
        className={`mb-4 overflow-hidden transition-all duration-300 border-gray-200 shadow-sm hover:shadow-md cursor-pointer ${isExpanded ? "ring-1 ring-indigo-100" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">{trip.name}</h3>
                <Badge
                  className={`${getStatusColor(trip.status)} hover:${getStatusColor(trip.status)} border-none capitalize`}
                >
                  {trip.status}
                </Badge>
                {trip.trip_type && (
                  <Badge
                    variant="outline"
                    className="text-gray-600 border-gray-200 font-medium"
                  >
                    {trip.trip_type}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {formatDateRange(trip.start_date, trip.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">
                    {trip.scout_names && trip.scout_names.length > 0
                      ? trip.scout_names.join(", ")
                      : trip.scout_ids && trip.scout_ids.length > 0
                        ? trip.scout_ids.join(", ")
                        : "Sarah Johnson, Michael Lee"}
                  </span>
                </div>
                {trip.weather && (
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    <span className="font-medium">{trip.weather}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-gray-400">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Approached
              </p>
              <p className="text-xl font-bold text-gray-900">
                {trip.prospects_approached}
              </p>
            </div>
            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Submitted
              </p>
              <p className="text-xl font-bold text-indigo-600">
                {trip.prospects_agreed}
              </p>
            </div>
            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Added to Pipeline
              </p>
              <p className="text-xl font-bold text-green-600">
                {trip.prospects_added}
              </p>
            </div>
            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Conversion Rate
              </p>
              <p className="text-xl font-bold text-purple-600">
                {trip.conversion_rate}%
              </p>
            </div>
            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Total Cost
              </p>
              <p className="text-xl font-bold text-gray-900">
                ${trip.total_cost?.toLocaleString()}
              </p>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Locations Visited */}
              <div>
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <MapPin className="w-4 h-4" />
                  <h4 className="font-bold text-sm uppercase tracking-wider">
                    Locations Visited ({trip.locations_visited?.length || 0})
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {trip.locations_visited?.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          {loc.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {loc.date}, {loc.time}
                        </p>
                      </div>
                      <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50">
                        {loc.prospects_found} found
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trip Photos */}
              {trip.photos && trip.photos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 text-blue-600">
                    <Camera className="w-4 h-4" />
                    <h4 className="font-bold text-sm uppercase tracking-wider">
                      Trip Photos ({trip.photos.length})
                    </h4>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {trip.photos.map((photo, i) => (
                      <div
                        key={i}
                        className="relative flex-shrink-0 cursor-pointer group"
                        onClick={(e) => openLightbox(i, e)}
                      >
                        <img
                          src={photo}
                          alt={`Trip photo ${i + 1}`}
                          className="w-48 h-32 object-cover rounded-xl border border-gray-100 shadow-sm transition-transform group-hover:scale-[1.02]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {trip.description && (
                <div>
                  <div className="flex items-center gap-2 mb-4 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <h4 className="font-bold text-sm uppercase tracking-wider">
                      Notes & Observations
                    </h4>
                  </div>
                  <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-sm text-gray-600 leading-relaxed">
                    {trip.description}
                  </div>
                </div>
              )}

              {/* Edit Button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(trip);
                  }}
                  className="bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-100 rounded-xl px-6 flex items-center gap-2 font-bold"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  View Details & Update
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <PhotoLightbox
        photos={trip.photos || []}
        initialIndex={photoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export const ScoutingTrips = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<ScoutingTrip | null>(null);
  const [trips, setTrips] = useState<ScoutingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const agencyId = await scoutingService.getUserAgencyId();
      if (agencyId) {
        const data = await scoutingService.getTrips(agencyId);
        setTrips(data);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (trip: ScoutingTrip) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrip(null);
  };

  const handleTripSaved = () => {
    fetchData();
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scouting Trips</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track your field scouting missions
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTrip(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Plan New Trip
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">
            Loading your scouting trips...
          </p>
        </div>
      ) : (
        <>
          <TripAnalytics trips={trips} />

          <div className="grid grid-cols-1 gap-4">
            {trips.length > 0 ? (
              trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onEdit={handleEdit} />
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No trips planned yet
                </h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-1">
                  Start by planning your first scouting mission to discover new
                  talent.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant="outline"
                  className="mt-6 rounded-xl border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                >
                  Plan Your First Trip
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <PlanTripModal
        isOpen={isModalOpen}
        initialData={editingTrip}
        onClose={handleCloseModal}
        onPlan={handleTripSaved}
      />
    </div>
  );
};
