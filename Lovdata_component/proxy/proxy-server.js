const express = require('express'); 
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. SØK ENDPOINT
app.get('/api/lovdata-search', async (req, res) => {
  const { q, type = 'ALL' } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is empty' });
  }

  try {
    const lovdataUrl = `https://lovdata.no/sok?q=${encodeURIComponent(q)}&type=${type}`;
    const response = await fetch(lovdataUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8',
        'Referer': 'https://lovdata.no/'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];
    $('.item.globalSearchResult').each((i, el) => {
      const title = $(el).find('h2 strong').text().trim();
      const link = $(el).find('a').attr('href');
      const id = $(el).find('span.red').text().trim();
      const dept = $(el).find('span.blueLight').text().trim();
    
      if (title && link) {
        results.push({
          title,
          link: link.startsWith('http') ? link : `https://lovdata.no${link}`,
          id,
          base: id,
          department: dept
        });
      }
    });

    console.log(` Search: Found ${results.length} results for "${q}"`);
    res.json({ query: q, results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to scrape Lovdata', message: error.message });
  }
});

// 2. HENT LOV-DOKUMENT fra søkeresultat link
app.get('/api/lovdata-document/:base', async (req, res) => {
  const { base } = req.params;
  
  console.log(` Fetching document: ${base}`);
  
  if (!base) {
    return res.status(400).json({ error: 'Base parameter is required' });
  }

  try {
    // Parse base ID: LOV-1981-04-08-7 -> type=lov, date=1981-04-08-7
    const parts = base.split('-');
    let docType = 'lov';
    let dateId = base;
    
    if (parts.length >= 4) {
      const typePrefix = parts[0].toLowerCase();
      if (typePrefix === 'for') {
        docType = 'forskrift';
      } else if (typePrefix === 'lov') {
        docType = 'lov';
      }
      // Fjern prefix: LOV-1981-04-08-7 -> 1981-04-08-7
      dateId = parts.slice(1).join('-');
    }
    
    const lovdataUrl = `https://lovdata.no/dokument/NL/${docType}/${dateId}`;
    console.log(` Requesting: ${lovdataUrl}`);
    
    const response = await fetch(lovdataUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8',
        'Referer': 'https://lovdata.no/'
      }
    });

    if (!response.ok) {
      console.error(` Lovdata returned ${response.status}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch document', 
        status: response.status,
        attemptedUrl: lovdataUrl
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Scrape dokumentstruktur
    const title = $('h1').first().text().trim() || $('.doc-title').text().trim();
    
    // Hent kapitler
    const chapters = [];
    
    // Prøv å finne kapitler på ulike måter
    $('.章節, .chapter, section[id*="KAPITTEL"], div[id*="KAPITTEL"]').each((i, chapterEl) => {
      const chapterTitle = $(chapterEl).find('h2, h3, .heading').first().text().trim();
      const chapterId = $(chapterEl).attr('id') || `chapter-${i}`;
      
      const paragraphs = [];
      
      // Finn paragrafer inni kapittelet
      $(chapterEl).find('.paragraf, .paragraph, div[id*="PARAGRAF"], section[class*="paragraf"]').each((j, paraEl) => {
        const paraText = $(paraEl).text().trim();
        const paraId = $(paraEl).attr('id') || '';
        
        // Ekstraher paragrafnummer (§ 1, § 2, etc)
        const match = paraText.match(/§\s*(\d+[a-z]?)/i);
        const paraNumber = match ? `§ ${match[1]}` : `Para ${j + 1}`;
        
        if (paraText) {
          paragraphs.push({
            id: paraId,
            number: paraNumber,
            content: paraText.substring(0, 500)
          });
        }
      });

      if (chapterTitle || paragraphs.length > 0) {
        chapters.push({
          id: chapterId,
          title: chapterTitle || `Kapittel ${i + 1}`,
          paragraphs: paragraphs
        });
      }
    });

    console.log(` Scraped: ${title} (${chapters.length} chapters)`);
    
    res.json({
      base: base,
      title: title,
      shortTitle: title,
      chapters: chapters,
      url: lovdataUrl
    });
  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ 
      error: 'Failed to scrape document', 
      message: error.message
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Proxy server is running!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Lovdata proxy server running at http://localhost:${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   - GET /api/test`);
  console.log(`   - GET /api/lovdata-search?q=<query>`);
  console.log(`   - GET /api/lovdata-document/:base`);
});

