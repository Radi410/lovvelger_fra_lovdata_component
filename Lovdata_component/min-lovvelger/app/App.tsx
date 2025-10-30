import { useState } from "react";
import { LawSelector } from "./components/law-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import { BookText, Scale } from "lucide-react";

export default function App() {
  const [selectedLaw, setSelectedLaw] = useState<{
    law: string;
    chapter?: string;
    paragraph?: string;
    fullReference?: string;
    juridicalReference?: string;
  }>({ law: "", chapter: "", paragraph: "" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Scale className="h-10 w-10 text-slate-700" />
            <h1 className="text-slate-900">Norsk Lovvelger</h1>
          </div>
          <p className="text-slate-600">
            Søk og velg fra norske lover, kapitler og paragrafer
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookText className="h-5 w-5" />
              Velg lovparagraf
            </CardTitle>
            <CardDescription>
              Bruk søkefeltet til å finne lover, eller bla gjennom kapitlene for å finne riktig paragraf
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="law-selector">Lov og paragraf</Label>
              <LawSelector
                value={selectedLaw}
                onChange={setSelectedLaw}
                placeholder="Velg lov, kapittel eller paragraf..."
              />
            </div>

            {selectedLaw.law && (
              <>
                <Separator />
                <div className="rounded-lg bg-slate-50 p-4 space-y-3">
                  <h3 className="text-slate-900 font-semibold">Valgt:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-600 min-w-[80px] font-medium">Lov:</span>
                      <span className="text-slate-900">{selectedLaw.law}</span>
                    </div>
                    {selectedLaw.chapter && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-600 min-w-[80px] font-medium">Kapittel:</span>
                        <span className="text-slate-900">{selectedLaw.chapter}</span>
                      </div>
                    )}
                    {selectedLaw.paragraph && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-600 min-w-[80px] font-medium">Paragraf:</span>
                        <span className="text-slate-900">{selectedLaw.paragraph}</span>
                      </div>
                    )}
                    {selectedLaw.juridicalReference && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-600 min-w-[80px] font-medium">Referanse:</span>
                        <span className="text-slate-900 font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {selectedLaw.juridicalReference}
                        </span>
                      </div>
                    )}
                    {selectedLaw.fullReference && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-600 min-w-[80px] font-medium">ID:</span>
                        <span className="text-slate-900 font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {selectedLaw.fullReference}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Demo Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tilgjengelige lover</CardTitle>
            <CardDescription>
               Inkluderer noen av de mest brukte norske lovene
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-slate-900 font-medium">Straffeloven</div>
                <div className="text-sm text-slate-600">Lov om straff</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-900 font-medium">Arbeidsmiljøloven</div>
                <div className="text-sm text-slate-600">Arbeidsmiljø, arbeidstid og stillingsvern</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-900 font-medium">Personopplysningsloven</div>
                <div className="text-sm text-slate-600">Behandling av personopplysninger</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-900 font-medium">Vegtrafikkloven</div>
                <div className="text-sm text-slate-600">Lov om vegtrafikk</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}