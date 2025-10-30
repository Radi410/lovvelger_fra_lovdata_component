import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { ChevronDown, ChevronRight, Search, BookOpen, X, Loader2, Check } from "lucide-react";
import { Badge } from "./ui/badge";
import { lovdataScraper, Law, Chapter, Paragraph, LawFilter } from "./lovdata-scraper";

interface LawSelectorProps {
  value?: { 
    law: string; 
    chapter?: string; 
    paragraph?: string;
    fullReference?: string;
  };
  onChange?: (selection: { 
    law: string; 
    chapter?: string; 
    paragraph?: string;
    fullReference?: string;
    juridicalReference?: string;
  }) => void;
  placeholder?: string;
  filter?: LawFilter;
  preloadedLaws?: string[];
  // Ny prop for å støtte multi-select
  multiSelect?: boolean;
  selectedParagraphs?: Array<{
    law: string;
    chapter: string;
    paragraph: string;
    fullReference: string;
    juridicalReference: string;
  }>;
  onParagraphsChange?: (paragraphs: Array<{
    law: string;
    chapter: string;
    paragraph: string;
    fullReference: string;
    juridicalReference: string;
  }>) => void;
}

export function LawSelector({ 
  value, 
  onChange, 
  placeholder = "Velg lov...",
  filter,
  preloadedLaws = [],
  multiSelect = false,
  selectedParagraphs = [],
  onParagraphsChange
}: LawSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLaws, setExpandedLaws] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (preloadedLaws.length > 0) {
      loadPreloadedLaws();
    }
  }, [preloadedLaws]);

  const loadPreloadedLaws = async () => {
    setLoading(true);
    try {
      const loadedLaws = await Promise.all(
        preloadedLaws.map(base => lovdataScraper.fetchLaw(base))
      );
      
      const validLaws = loadedLaws.filter((law): law is Law => law !== null);
      console.log('Loaded laws with chapters:', validLaws.map(l => ({ 
        id: l.id, 
        base: l.base,
        shortName: l.shortName,
        fullName: l.fullName,
        chaptersCount: l.chapters.length,
        firstChapter: l.chapters[0] 
      })));
      const filteredLaws = filter 
      
        ? validLaws.map(law => lovdataScraper.filterLaw(law, filter))
        : validLaws;
      
      setLaws(filteredLaws);
    } catch (error) {
      console.error("Failed to load preloaded laws:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      if (preloadedLaws.length === 0) {
        setLaws([]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await lovdataScraper.searchLaws(searchQuery);
        
        const lawsWithStructure = await Promise.all(
          results.slice(0, 5).map(async (result) => {
            console.log('Processing result:', result);
            const baseId = result.id ?? (result as any).base ?? (result as any).baseId;
            
            if (!baseId) {
              console.error('No baseId found for result:', result);
              return null;
            }
            
            const law = await lovdataScraper.fetchLaw(baseId);
            console.log('Law IMMEDIATELY after fetchLaw:', law ? { 
  id: law.id, 
  shortName: law.shortName,
  chapters: law.chapters?.length ?? 'NO CHAPTERS PROPERTY'
} : 'NULL LAW');

            // Fix "Hovedmeny" title
            if (law && (law.shortName === 'Hovedmeny' || law.fullName === 'Hovedmeny')) {
              // ✅ Returner et nytt objekt i stedet for å mutere
              return {
                ...law,
                shortName: result.title,
                fullName: result.title,
              };
            }

            return law;
          })
        );
        
        const validLaws = lawsWithStructure.filter((law): law is Law => law !== null);
        console.log('Valid laws BEFORE filter:', validLaws.map(l => ({ 
  id: l.id, 
  shortName: l.shortName,
  chapters: l.chapters.length 
})));
        const filteredLaws = filter 
          ? validLaws.map(law => lovdataScraper.filterLaw(law, filter))
          : validLaws;
        
        setLaws(filteredLaws);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredLaws = useMemo(() => {
    console.log('Input laws to filter:', laws.map(l => ({ id: l.id, chapters: l.chapters.length })));
    if (!searchQuery) return laws;

    const query = searchQuery.toLowerCase();
    return laws
      .map((law) => {
        const lawMatches =
          law.shortName.toLowerCase().includes(query) ||
          law.fullName.toLowerCase().includes(query);

        const filteredChapters = law.chapters
          .map((chapter) => {
            const chapterMatches =
              chapter.title.toLowerCase().includes(query) ||
              chapter.number.toLowerCase().includes(query);

            const filteredParagraphs = chapter.paragraphs.filter(
              (paragraph) =>
                paragraph.number.toLowerCase().includes(query) ||
                paragraph.title.toLowerCase().includes(query)
            );

            if (chapterMatches || filteredParagraphs.length > 0) {
              return { 
                ...chapter, 
                paragraphs: filteredParagraphs.length > 0 ? filteredParagraphs : chapter.paragraphs 
              };
            }
            return null;
          })
          .filter((chapter): chapter is Chapter => chapter !== null);

        if (lawMatches || filteredChapters.length > 0) {
          return { 
            ...law, 
            chapters: filteredChapters.length > 0 ? filteredChapters : law.chapters 
          };
        }
        return null;
      })
      .filter((law): law is Law => law !== null);
  }, [laws, searchQuery]);

  const toggleLaw = async (lawId: string) => {
  const newExpanded = new Set(expandedLaws);
  if (newExpanded.has(lawId)) {
    newExpanded.delete(lawId);
  } else {
    newExpanded.add(lawId);
    
    const law = laws.find(l => l.id === lawId);
    if (law && law.chapters.length === 0) {
      try {
        
        const details = await lovdataScraper.fetchLaw(law.base);
        if (details) {
          // Fix "Hovedmeny" title
          if (details.shortName === 'Hovedmeny' || details.fullName === 'Hovedmeny') {
            details.shortName = law.shortName;
            details.fullName = law.fullName;
          }
          
          const filteredDetails = filter 
            ? lovdataScraper.filterLaw(details, filter)
            : details;
          setLaws(laws.map(l => l.id === lawId ? filteredDetails : l));
        }
      } catch (error) {
        console.error("Failed to load law details:", error);
      }
    }
  }
  setExpandedLaws(newExpanded);
};

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleSelectParagraph = (law: Law, chapter: Chapter, paragraph: Paragraph) => {
    const fullReference = lovdataScraper.buildReference(law.base, paragraph.chapterIndex);
    const selection = {
      law: law.shortName,
      chapter: chapter.number,
      paragraph: `${paragraph.number} ${paragraph.title}`,
      fullReference: fullReference,
      juridicalReference: paragraph.juridicalReference,
    };

    if (multiSelect && onParagraphsChange) {
      // Multi-select mode
      const isAlreadySelected = selectedParagraphs.some(
        p => p.fullReference === fullReference
      );
      
      if (isAlreadySelected) {
        // Remove from selection
        onParagraphsChange(selectedParagraphs.filter(p => p.fullReference !== fullReference));
      } else {
        // Add to selection
        onParagraphsChange([...selectedParagraphs, selection]);
      }
    } else {
      // Single select mode
      onChange?.(selection);
      setOpen(false);
    }
  };

  const isParagraphSelected = (fullReference: string) => {
    if (multiSelect) {
      return selectedParagraphs.some(p => p.fullReference === fullReference);
    }
    return value?.fullReference === fullReference;
  };

  const getDisplayValue = () => {
    if (multiSelect) {
      if (selectedParagraphs.length === 0) return placeholder;
      return `${selectedParagraphs.length} paragraf${selectedParagraphs.length > 1 ? 'er' : ''} valgt`;
    }
    
    if (!value?.law) return placeholder;
    const parts = [value.law];
    if (value.chapter) parts.push(value.chapter);
    if (value.paragraph) parts.push(value.paragraph);
    return parts.join(" - ");
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiSelect && onParagraphsChange) {
      onParagraphsChange([]);
    } else {
      onChange?.({ 
        law: "", 
        chapter: "", 
        paragraph: "",
        fullReference: "",
        juridicalReference: ""
      });
    }
  };

  const renderParagraphWithLedd = (law: Law, chapter: Chapter, paragraph: Paragraph) => {
    const fullReference = lovdataScraper.buildReference(law.base, paragraph.chapterIndex);
    const isSelected = isParagraphSelected(fullReference);

    return (
      <div className="space-y-1">
        <button
          onClick={() => handleSelectParagraph(law, chapter, paragraph)}
          className={`flex w-full items-start gap-2 rounded-md p-2 hover:bg-primary/10 text-left text-sm ${
            isSelected ? 'bg-primary/5 border border-primary/20' : ''
          }`}
        >
          {multiSelect && (
            <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
            }`}>
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          )}
          <span className="shrink-0 text-muted-foreground font-medium">
            {paragraph.number}
          </span>
          <span className="flex-1 min-w-0 truncate">
            {paragraph.title}
          </span>
        </button>
        
        {paragraph.ledd && paragraph.ledd.length > 0 && (
          <div className="ml-8 space-y-0.5 text-xs">
            {paragraph.ledd.map((ledd) => (
              <div key={ledd.id} className="text-muted-foreground">
                <span className="font-medium">Ledd {ledd.number}:</span>
                <span className="ml-2">{ledd.content.substring(0, 100)}...</span>
                
                {ledd.bokstaver && ledd.bokstaver.length > 0 && (
                  <div className="ml-4 mt-1">
                    {ledd.bokstaver.map((bokstav) => (
                      <div key={bokstav.id}>
                        <span className="font-medium">{bokstav.letter})</span>
                        <span className="ml-1">{bokstav.content.substring(0, 80)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{getDisplayValue()}</span>
          <div className="flex items-center gap-2">
            {((value?.law) || (multiSelect && selectedParagraphs.length > 0)) && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={clearSelection}
              />
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Søk etter lover, kapitler, paragrafer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="h-[500px]">
          <div className="p-2">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Laster lover fra Lovdata...
              </div>
            ) : filteredLaws.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery 
                  ? "Ingen resultater funnet. Prøv å søke etter lovnavn."
                  : preloadedLaws.length > 0 
                    ? "Laster lover..."
                    : "Søk etter lover for å starte"}
              </div>
            ) : (
              filteredLaws.map((law) => (
                <div key={law.id} className="mb-2">
                  <button
                    onClick={() => toggleLaw(law.id)}
                    className="flex w-full items-start gap-2 rounded-md p-2 hover:bg-accent text-left"
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform mt-0.5 ${
                        expandedLaws.has(law.id) ? "rotate-90" : ""
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{law.shortName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {law.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Base: {law.base}
                      </div>
                    </div>
                  </button>

                  {expandedLaws.has(law.id) && (
                    <div className="ml-6 mt-1 space-y-1">
                     {(() => { console.log('Rendering law:', law.id, 'Chapters:', law.chapters, 'Length:', law.chapters?.length); return null; })()}
                      
                      {law.chapters.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-2">
                          Laster kapitler...
                          
                        </div>
                      ) : (
                        law.chapters.map((chapter) => (
                          <div key={chapter.id}>
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="flex w-full items-start gap-2 rounded-md p-2 hover:bg-accent/50 text-left"
                            >
                              <ChevronRight
                                className={`h-3.5 w-3.5 shrink-0 transition-transform mt-0.5 ${
                                  expandedChapters.has(chapter.id) ? "rotate-90" : ""
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm">
                                  <Badge variant="outline" className="mr-2">
                                    {chapter.number}
                                  </Badge>
                                  <span>{chapter.title}</span>
                                </div>
                              </div>
                            </button>

                            {expandedChapters.has(chapter.id) && (
                              <div className="ml-6 mt-1 space-y-0.5">
                                {chapter.paragraphs.map((paragraph) => (
                                  <div key={paragraph.id}>
                                    {renderParagraphWithLedd(law, chapter, paragraph)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}