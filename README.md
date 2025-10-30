# Lovvelger

En komponent for å søke, navigere og velge paragrafer fra norske lover og forskrifter.

## Oversikt

Lovvelger er designet for å fungere som en "datepicker for lover" en intuitiv måte å finne og velge spesifikke lovparagrafer med tilhørende ledd og bokstaver.
Siden jeg ikke har tilgang til lovdata API så har jeg bestemt å lage en proxy server som webscraper. Fraråder å bruke dette i produksjon! Dette prosjektet er egnet for testing!

### Funksjonalitet

1. Søk etter lover og forskrifter
2. Naviger gjennom kapitler og paragrafer
3. Velg spesifikke paragrafer med ledd og bokstaver
4. Få ut både maskinlesbar ID og juridisk referanse (f.eks "§ 2. Virkeområde, ledd 1, bokstav a")

### Use cases

- Hjemling av vedtak i offentlig sektor
- Dokumentasjon av regelverksgrunnlag
- Integrasjon i saksbehandlingssystemer
- Juridiske referansesystemer

## Arkitektur

Prosjektet består av tre hovedkomponenter:

### 1. Frontend (Next.js)
- React-komponenter for UI
- TypeScript for type-sikkerhet
- Shadcn/ui for designsystem
- Tailwind CSS for styling

### 2. Proxy Server (Express)
- Node.js backend som kommuniserer med Lovdata
- Web scraping av lovdata.no
- Strukturering av lovdata til JSON

### 3. Lovdata Scraper (TypeScript)
- Parser og strukturerer lovdata
- Håndterer søk og filtrering
- Bygger juridiske referanser

## Installasjon og kjøring

### Forutsetninger

- Node.js 20 eller nyere
- npm eller yarn



### Uten Docker (lokal utvikling)

#### Terminal 1 - Proxy server
```bash
npm install
node proxy-server.js
```

#### Terminal 2 - Frontend
```bash
npm install
npm run dev
```

### Stopp applikasjonen
```bash


# Uten Docker
# Trykk Ctrl+C i begge terminalene
```

## Bruk av komponenten

### Enkel bruk
```tsx
import { LawSelector } from './components/law-selector';

function MyComponent() {
  const [selection, setSelection] = useState({
    law: "",
    chapter: "",
    paragraph: "",
    fullReference: "",
    juridicalReference: ""
  });

  return (
    <LawSelector
      value={selection}
      onChange={setSelection}
      placeholder="Velg lov og paragraf..."
    />
  );
}
```

### Multi-select mode
```tsx
import { LawSelector } from './components/law-selector';

function MyComponent() {
  const [selectedParagraphs, setSelectedParagraphs] = useState([]);

  return (
    <LawSelector
      multiSelect={true}
      selectedParagraphs={selectedParagraphs}
      onParagraphsChange={setSelectedParagraphs}
      placeholder="Velg flere paragrafer..."
    />
  );
}
```

### Med forhåndsdefinert filter
```tsx
<LawSelector
  filter={{
    lawBase: "LOV-2005-06-17-64",
    allowedChapters: ["kapittel-1", "kapittel-2"],
    allowedParagraphs: ["paragraf-1", "paragraf-2"]
  }}
  placeholder="Velg fra barnehageloven..."
/>
```

### Med forhåndslastede lover
```tsx
<LawSelector
  preloadedLaws={[
    "LOV-2005-06-17-64", // Barnehageloven
    "LOV-1981-04-08-7"   // Barnelova
  ]}
  placeholder="Velg fra forhåndslastede lover..."
/>
```

## Webscraper/API

### LawSelector Props

| Prop | Type | Default | Beskrivelse |
|------|------|---------|-------------|
| `value` | `object` | - | Valgt lov/paragraf |
| `onChange` | `function` | - | Callback når valg endres |
| `placeholder` | `string` | "Velg lov..." | Placeholder-tekst |
| `filter` | `LawFilter` | - | Forhåndsdefinert filter |
| `preloadedLaws` | `string[]` | `[]` | Array av base IDs å laste |
| `multiSelect` | `boolean` | `false` | Tillat valg av flere paragrafer |
| `selectedParagraphs` | `array` | `[]` | Valgte paragrafer (multi-select) |
| `onParagraphsChange` | `function` | - | Callback for multi-select |

### Data-strukturer

#### Selection object
```typescript
{
  law: string;              // Navn på loven
  chapter?: string;         // Kapittel-nummer
  paragraph?: string;       // Paragraf-nummer og tittel
  fullReference?: string;   // Maskinlesbar ID (f.eks "LOV-2005-06-17-64_kapittel-1-paragraf-2")
  juridicalReference?: string; // Juridisk referanse (f.eks "§ 2. Virkeområde, ledd 1")
}
```

#### LawFilter object
```typescript
{
  lawBase: string;           // Base ID for lov (f.eks "LOV-2005-06-17-64")
  allowedChapters?: string[]; // Array av tillatte kapittel-IDer
  allowedParagraphs?: string[]; // Array av tillatte paragraf-IDer
  preselectedReference?: string; // Forhåndsvalgt referanse
}
```

## Datakilder

Prosjektet henter data fra Lovdata.no ved hjelp av web scraping.

### Viktig merknad om produksjonsbruk

Dagens implementasjon bruker web scraping for prototype og utvikling. For produksjonsbruk anbefales det å:

1. Kontakte Lovdata for API-tilgang
2. Bruke data.norge.no for åpne datasett
3. Bygge en statisk database av relevante lover

Se `proxy-server.js` for implementasjonsdetaljer.

### Cache-strategi

For å redusere belastning på Lovdata:
- Cache søkeresultater i minst 24 timer
- Hold minimum 1 sekund mellom requests
- Unngå å kjøre på produksjon uten avtale

## Utvikling

### Prosjektstruktur
```
lovvelger/
├── app/                    # Next.js app directory
│   ├── components/        # React komponenter
│   │   ├── law-selector.tsx
│   │   ├── lovdata-scraper.tsx
│   │   └── ui/           # Shadcn/ui komponenter
│   └── page.tsx          # Hovedside
├─ package.json         # Dependencies
proxy/
├─ proxy_server # proxy to run
├─ package.json         # Dependencies


```

### Teknologier

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Backend**: Express, Cheerio (web scraping)
- **Build**: Docker, Docker Compose

### Kjøre tester
```bash
# Kjør linting
npm run lint

# Kjør type-checking
npm run type-check

# Kjør build test
npm run build
```

## Bidrag

Dette prosjektet er utviklet for intern bruk i offentlig sektor. For bidrag eller forslag:

1. Fork repository
2. Opprett en feature branch
3. Commit endringer med beskrivende meldinger
4. Push til din fork
5. Opprett en Pull Request


## Kontakt

For spørsmål eller support, kontakt radi@radionova.no.

## Kjente begrensninger

- Web scraping er ikke ideelt for produksjon
- Lovdata-struktur kan endre seg uten varsel
- Ikke alle lover har komplett struktur
- Mangler støtte for ledd og bokstaver i søk
- Ingen offline-støtte

## Fremtidige forbedringer

- Integrasjon med offisielt Lovdata API
- Støtte for EU-forordninger
- Bedre parsing av ledd og bokstaver
- Offline-cache for vanlige lover
- Eksport til ulike formater (JSON, PDF)
- Versjonshåndtering av lover
- Historiske versjoner av lovtekster
