import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Download, Plus, Trash2, Type, Sparkles, Move } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function VideoEditor({ clips, onAddClip, type = "video" }) {
  const [timeline, setTimeline] = useState(clips || []);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  });
  const [textOverlays, setTextOverlays] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (clips && clips.length > 0) {
      setTimeline(clips.map((clip, index) => ({
        id: `clip-${index}`,
        url: clip,
        duration: 5,
        type: type
      })));
    }
  }, [clips, type]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(timeline);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTimeline(items);
  };

  const removeClip = (clipId) => {
    setTimeline(timeline.filter(clip => clip.id !== clipId));
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({ ...filters, [filterName]: value });
    applyFilters();
  };

  const applyFilters = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px)`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  };

  const addTextOverlay = () => {
    if (!newText.trim()) return;
    
    setTextOverlays([...textOverlays, {
      id: `text-${Date.now()}`,
      text: newText,
      x: 50,
      y: 50,
      fontSize: 32,
      color: "#ffffff"
    }]);
    setNewText("");
    setShowTextInput(false);
  };

  const exportVideo = async () => {
    // In a real implementation, this would use FFmpeg.wasm or similar
    // For now, we'll just download the first clip with filters applied
    if (timeline.length === 0) return;
    
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edited-video.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Preview Area */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-white">Preview</h3>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {selectedClip ? (
              <>
                {selectedClip.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={selectedClip.url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onLoadedMetadata={applyFilters}
                  />
                ) : (
                  <img
                    src={selectedClip.url}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ mixBlendMode: 'normal' }}
                />
                
                {/* Text Overlays */}
                {textOverlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    className="absolute cursor-move"
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      fontSize: `${overlay.fontSize}px`,
                      color: overlay.color,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {overlay.text}
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a clip to preview
              </div>
            )}
          </div>

          {/* Playback Controls */}
          {selectedClip && selectedClip.type === 'video' && (
            <div className="mt-4 flex items-center gap-4">
              <Button
                size="sm"
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                    } else {
                      videoRef.current.play();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="bg-white/10 hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={videoRef.current?.duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = e.target.value;
                      setCurrentTime(e.target.value);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Timeline */}
        <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Timeline</h3>
            <Button
              size="sm"
              onClick={exportVideo}
              className="bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-90"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="timeline" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-2 overflow-x-auto pb-2"
                >
                  {timeline.map((clip, index) => (
                    <Draggable key={clip.id} draggableId={clip.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setSelectedClip(clip)}
                          className={`relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                            selectedClip?.id === clip.id ? 'border-[#F18B6A]' : 'border-white/10'
                          }`}
                        >
                          {clip.type === 'video' ? (
                            <video src={clip.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={clip.url} alt="Clip" className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(clip.id);
                            }}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 rounded p-1"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                            {clip.duration}s
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {timeline.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No clips in timeline. Generate some content first!
            </div>
          )}
        </Card>
      </div>

      {/* Controls Panel */}
      <div className="space-y-4">
        {/* Filters */}
        <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F18B6A]" />
            Filters
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Brightness: {filters.brightness}%
              </label>
              <Slider
                value={[filters.brightness]}
                onValueChange={([v]) => handleFilterChange('brightness', v)}
                min={0}
                max={200}
                step={1}
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Contrast: {filters.contrast}%
              </label>
              <Slider
                value={[filters.contrast]}
                onValueChange={([v]) => handleFilterChange('contrast', v)}
                min={0}
                max={200}
                step={1}
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Saturation: {filters.saturation}%
              </label>
              <Slider
                value={[filters.saturation]}
                onValueChange={([v]) => handleFilterChange('saturation', v)}
                min={0}
                max={200}
                step={1}
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Blur: {filters.blur}px
              </label>
              <Slider
                value={[filters.blur]}
                onValueChange={([v]) => handleFilterChange('blur', v)}
                min={0}
                max={10}
                step={0.5}
              />
            </div>
          </div>
        </Card>

        {/* Text Overlays */}
        <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-[#32C8D1]" />
            Text Overlays
          </h3>

          {showTextInput ? (
            <div className="space-y-3">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter text..."
                className="bg-white/5 border-white/10 text-white"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addTextOverlay}
                  className="flex-1 bg-gradient-to-r from-[#32C8D1] to-teal-500"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowTextInput(false);
                    setNewText("");
                  }}
                  className="border-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowTextInput(true)}
              className="w-full bg-white/10 hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Text
            </Button>
          )}

          {textOverlays.length > 0 && (
            <div className="mt-4 space-y-2">
              {textOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="flex items-center justify-between p-2 bg-white/5 rounded"
                >
                  <span className="text-sm text-white truncate">{overlay.text}</span>
                  <button
                    onClick={() => setTextOverlays(textOverlays.filter(t => t.id !== overlay.id))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-white">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5 justify-start"
              onClick={() => handleFilterChange('brightness', 100)}
            >
              Reset Filters
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5 justify-start"
              onClick={() => setTextOverlays([])}
            >
              Clear All Text
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}