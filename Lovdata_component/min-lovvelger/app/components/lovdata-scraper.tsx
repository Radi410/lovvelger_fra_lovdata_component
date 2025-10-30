// Lovdata Web Scraper - Henter strukturert lovdata via Lovdata sitt API
// Basert på Lovdata sitt strukturerte format via /v1/structuredRules/get endpoint

export interface LovdataSearchResult {
  title: string;
  link: string;
  id: string;
  department: string;
}

export interface LovdataReference {
  base: string;
  chapterIndex?: string;
  fullReference?: string;
}

export interface Paragraph {
  id: string;
  number: string;
  title: string;
  content?: string;
  chapterIndex: string;
  juridicalReference: string;
  ledd?: Ledd[];
}

export interface Ledd {
  id: string;
  number: number;
  content: string;
  juridicalReference: string;
  bokstaver?: Bokstav[];
}

export interface Bokstav {
  id: string;
  letter: string;
  content: string;
  juridicalReference: string;
}

export interface Chapter {
  id: string;
  number: string;
  title: string;
  chapterIndex: string;
  paragraphs: Paragraph[];
  subChapters?: Chapter[];
}

export interface Law {
  id: string;
  base: string;
  shortName: string;
  fullName: string;
  chapters: Chapter[];
  rawTableOfContents?: any;
}

export interface LawFilter {
  lawBase: string;
  allowedChapters?: string[];
  allowedParagraphs?: string[];
  preselectedReference?: string;
}

class LovdataScraper {
    private proxyUrl: string;

  constructor(proxyUrl: string = 'http://localhost:3001/api') {
    this.proxyUrl = proxyUrl;
  }

  /**
   * Hent et regelverk med full struktur
   */
  async fetchLaw(base: string, ruleFile: string = 'CURRENT'): Promise<Law | null> {
  try {
    // Bruk det NYE endpointet: /lovdata-document/:base
    const url = `${this.proxyUrl}/lovdata-document/${base}`;
    console.log('Fetching via proxy:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Proxy error:', errorData);
      throw new Error(`Fetch failed: ${response.status} - ${errorData.message || errorData.error}`);
    }

    const data = await response.json();
    return this.parseLawStructure(data, base);
  } catch (error) {
    console.error('Error fetching law:', error);
    return null;
  }
}

  /**
   * Søk etter lover via proxy
   */
  async searchLaws(query: string): Promise<LovdataSearchResult[]> {
  try {
    const url = `${this.proxyUrl}/lovdata-search?q=${encodeURIComponent(query)}&t=${Date.now()}`;
    console.log('Searching:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw search data:', data); 
    console.log('Results array:', data.results); 
    
    return data.results || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

  /**
   * Parse Lovdata structure til vårt format
   */
  private parseLawStructure(data: any, base: string): Law {
  console.log('Parsing law structure:', data);
  
  // Proxy-serveren returnerer allerede strukturert data!
  const chapters = (data.chapters || []).map((chapter: any, index: number) => {
    const chapterNumber = chapter.title?.match(/Kapittel\s+(\d+[A-Z]?)/i)?.[1] || `${index + 1}`;
    
    return {
      id: chapter.id || `chapter-${index}`,
      number: `Kapittel ${chapterNumber}`,
      title: chapter.title || `Kapittel ${index + 1}`,
      chapterIndex: chapter.id || `kapittel-${index}`,
      paragraphs: (chapter.paragraphs || []).map((para: any, pIndex: number) => {
        const paraNumber = para.number || `§ ${pIndex + 1}`;
        const paraContent = para.content || '';
        const paraTitle = this.extractParagraphTitle(paraContent) || 'Uten tittel';
        
        return {
          id: para.id || `${chapter.id}-para-${pIndex}`,
          number: paraNumber,
          title: paraTitle, 
          content: paraContent,
          chapterIndex: para.id || `${chapter.id}-paragraf-${pIndex}`,
          juridicalReference: `${paraNumber}. ${paraTitle}`,
          ledd: [], // TODO: Parse ledd fra content
        };
      }),
      subChapters: [],
    };
  });
  
  return {
    id: data.base || base,
    base: data.base || base,
    shortName: data.shortTitle || data.title || base,
    fullName: data.title || base,
    chapters: chapters,
    rawTableOfContents: undefined,
  };
}


  /**
   * Parse table of contents til kapitler og paragrafer
   */
  private parseTableOfContents(toc: any[], htmlContent: string): Chapter[] {
    const chapters: Chapter[] = [];

    for (const item of toc) {
      if (this.isChapter(item)) {
        const chapter = this.parseChapter(item, htmlContent);
        if (chapter) {
          chapters.push(chapter);
        }
      }
    }

    return chapters;
  }

  private isChapter(item: any): boolean {
    return item.type === 'kapittel' || item.heading?.toLowerCase().includes('kapittel');
  }

  private parseChapter(item: any, htmlContent: string, parentIndex: string = ''): Chapter | null {
    const chapterIndex = item.chapterIndex || this.extractChapterIndex(item);
    const fullIndex = parentIndex ? `${parentIndex}-${chapterIndex}` : chapterIndex;

    const chapter: Chapter = {
      id: fullIndex,
      number: item.chapterNumber || this.extractChapterNumber(item.heading),
      title: item.heading || 'Uten tittel',
      chapterIndex: fullIndex,
      paragraphs: [],
      subChapters: [],
    };

    if (item.children && Array.isArray(item.children)) {
      for (const child of item.children) {
        if (this.isChapter(child)) {
          const subChapter = this.parseChapter(child, htmlContent, fullIndex);
          if (subChapter) {
            chapter.subChapters!.push(subChapter);
          }
        } else if (this.isParagraph(child)) {
          const paragraph = this.parseParagraph(child, htmlContent, fullIndex);
          if (paragraph) {
            chapter.paragraphs.push(paragraph);
          }
        }
      }
    }

    return chapter;
  }

  private isParagraph(item: any): boolean {
    return item.type === 'paragraf' || 
           (item.heading && item.heading.match(/§\s*\d+/));
  }

  private parseParagraph(item: any, htmlContent: string, parentChapterIndex: string): Paragraph | null {
    const paragraphIndex = item.chapterIndex || this.extractParagraphIndex(item);
    const fullIndex = `${parentChapterIndex}-${paragraphIndex}`;
    
    const paragraphNumber = this.extractParagraphNumber(item.heading || '');
    const paragraphTitle = this.extractParagraphTitle(item.heading || '');

    const paragraph: Paragraph = {
      id: fullIndex,
      number: paragraphNumber,
      title: paragraphTitle,
      chapterIndex: fullIndex,
      juridicalReference: this.buildJuridicalReference(paragraphNumber, paragraphTitle),
      content: item.content || '',
      ledd: [],
    };

    if (item.children && Array.isArray(item.children)) {
      paragraph.ledd = this.parseLedd(item.children, fullIndex, paragraphNumber);
    }

    return paragraph;
  }

  private parseLedd(children: any[], parentIndex: string, paragraphNumber: string): Ledd[] {
    const ledd: Ledd[] = [];
    let leddNumber = 1;

    for (const child of children) {
      if (child.type === 'ledd' || this.isLedd(child)) {
        const leddId = `${parentIndex}-ledd-${leddNumber}`;
        const leddObj: Ledd = {
          id: leddId,
          number: leddNumber,
          content: child.content || child.text || '',
          juridicalReference: `${paragraphNumber}, ledd ${leddNumber}`,
          bokstaver: [],
        };

        if (child.children && Array.isArray(child.children)) {
          leddObj.bokstaver = this.parseBokstaver(child.children, leddId, paragraphNumber, leddNumber);
        }

        ledd.push(leddObj);
        leddNumber++;
      }
    }

    return ledd;
  }

  private parseBokstaver(children: any[], parentIndex: string, paragraphNumber: string, leddNumber: number): Bokstav[] {
    const bokstaver: Bokstav[] = [];
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let bokstavIndex = 0;

    for (const child of children) {
      if (child.type === 'bokstav' || this.isBokstav(child)) {
        const letter = letters[bokstavIndex] || `${bokstavIndex + 1}`;
        const bokstav: Bokstav = {
          id: `${parentIndex}-bokstav-${letter}`,
          letter: letter,
          content: child.content || child.text || '',
          juridicalReference: `${paragraphNumber}, ledd ${leddNumber}, bokstav ${letter}`,
        };
        bokstaver.push(bokstav);
        bokstavIndex++;
      }
    }

    return bokstaver;
  }

  private isLedd(item: any): boolean {
    return item.type === 'ledd' || item.className?.includes('ledd');
  }

  private isBokstav(item: any): boolean {
    return item.type === 'bokstav' || item.className?.includes('bokstav');
  }

  private extractChapterIndex(item: any): string {
    return item.chapterIndex || `kapittel-${item.chapterNumber || '0'}`;
  }

  private extractParagraphIndex(item: any): string {
    return item.chapterIndex || `paragraf-${item.paragraphNumber || '0'}`;
  }

  private extractChapterNumber(heading: string): string {
    const match = heading.match(/Kapittel\s+(\d+[A-Z]?)/i);
    return match ? `Kapittel ${match[1]}` : heading;
  }

  private extractParagraphNumber(heading: string): string {
    const match = heading.match(/§\s*(\d+[a-z]?)/i);
    return match ? `§ ${match[1]}` : heading.split('.')[0].trim();
  }

  private extractParagraphTitle(heading: string): string {
    const parts = heading.split('.');
    return parts.length > 1 ? parts.slice(1).join('.').trim() : '';
  }

  private buildJuridicalReference(paragraphNumber: string, title: string): string {
    return `${paragraphNumber}${title ? `. ${title}` : ''}`;
  }

  /**
   * Filtrer lover basert på forhåndsdefinert filter
   */
  filterLaw(law: Law, filter: LawFilter): Law {
    const filteredChapters = law.chapters
      .filter(chapter => {
        if (!filter.allowedChapters || filter.allowedChapters.length === 0) {
          return true;
        }
        return filter.allowedChapters.some(allowed => 
          chapter.chapterIndex.includes(allowed)
        );
      })
      .map(chapter => ({
        ...chapter,
        paragraphs: chapter.paragraphs.filter(paragraph => {
          if (!filter.allowedParagraphs || filter.allowedParagraphs.length === 0) {
            return true;
          }
          return filter.allowedParagraphs.some(allowed =>
            paragraph.chapterIndex.includes(allowed)
          );
        }),
      }));

    return {
      ...law,
      chapters: filteredChapters,
    };
  }

  /**
   * Parse en fullReference streng tilbake til komponenter
   */
  parseReference(fullReference: string): LovdataReference {
    const parts = fullReference.split('_');
    return {
      base: parts[0],
      chapterIndex: parts[1] || undefined,
      fullReference: fullReference,
    };
  }

  /**
   * Bygg en fullReference streng
   */
  buildReference(base: string, chapterIndex?: string): string {
    return chapterIndex ? `${base}_${chapterIndex}` : base;
  }
}

// Eksporter en singleton instance
export const lovdataScraper = new LovdataScraper();

// Eksporter også klassen hvis noen vil lage egne instanser
export default LovdataScraper;