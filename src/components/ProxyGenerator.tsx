import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Shuffle, 
  Copy, 
  Hash, 
  FileText, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Globe,
  Settings,
  Download,
  CheckCircle,
  AlertCircle,
  Zap,
  User,
  LogOut,
  Shield
} from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { 
  checkDuplicateProxies, 
  saveGeneratedProxies, 
  logGenerationHistory 
} from '../lib/supabase';

const countries = [
  { code: "us", name: "United States", flag: "🇺🇸", aliases: ["usa", "united states", "america"] },
  { code: "uk", name: "United Kingdom", flag: "🇬🇧", aliases: ["united kingdom", "britain", "england", "gb"] },
  { code: "ca", name: "Canada", flag: "🇨🇦", aliases: ["canada", "can"] },
  { code: "au", name: "Australia", flag: "🇦🇺", aliases: ["australia", "aus"] },
  { code: "de", name: "Germany", flag: "🇩🇪", aliases: ["germany", "deutschland", "ger"] },
  { code: "fr", name: "France", flag: "🇫🇷", aliases: ["france", "fra"] },
  { code: "jp", name: "Japan", flag: "🇯🇵", aliases: ["japan", "jpn"] },
  { code: "sg", name: "Singapore", flag: "🇸🇬", aliases: ["singapore", "sgp"] },
  { code: "nl", name: "Netherlands", flag: "🇳🇱", aliases: ["netherlands", "holland", "nld"] },
  { code: "br", name: "Brazil", flag: "🇧🇷", aliases: ["brazil", "brasil", "bra"] },
  { code: "in", name: "India", flag: "🇮🇳", aliases: ["india", "ind"] },
  { code: "mx", name: "Mexico", flag: "🇲🇽", aliases: ["mexico", "mex"] },
  { code: "es", name: "Spain", flag: "🇪🇸", aliases: ["spain", "esp"] },
  { code: "it", name: "Italy", flag: "🇮🇹", aliases: ["italy", "ita"] },
  { code: "ru", name: "Russia", flag: "🇷🇺", aliases: ["russia", "rus"] },
  { code: "kr", name: "South Korea", flag: "🇰🇷", aliases: ["korea", "south korea", "kor"] },
  { code: "se", name: "Sweden", flag: "🇸🇪", aliases: ["sweden", "swe"] },
  { code: "ch", name: "Switzerland", flag: "🇨🇭", aliases: ["switzerland", "che"] },
  { code: "at", name: "Austria", flag: "🇦🇹", aliases: ["austria", "aut"] },
  { code: "be", name: "Belgium", flag: "🇧🇪", aliases: ["belgium", "bel"] },
  { code: "bd", name: "Bangladesh", flag: "🇧🇩", aliases: ["bangladesh", "bd"] },
  { code: "pk", name: "Pakistan", flag: "🇵🇰", aliases: ["pakistan", "pk"] },
  { code: "ae", name: "UAE", flag: "🇦🇪", aliases: ["uae", "emirates", "ae"] },
  { code: "sa", name: "Saudi Arabia", flag: "🇸🇦", aliases: ["saudi", "saudi arabia", "sa"] },
];

interface ProxyGeneratorProps {
  onShowProfile: () => void;
  onShowAdmin: () => void;
}

export default function ProxyGenerator({ onShowProfile, onShowAdmin }: ProxyGeneratorProps) {
  const { theme, toggleTheme, mounted } = useTheme();
  const { currentUser, logout } = useAuth();

  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [password, setPassword] = useState("");
  const [bulkAmount, setBulkAmount] = useState("1");
  const [bulkProxies, setBulkProxies] = useState("");
  const [manualPasteInput, setManualPasteInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState(countries);

  const findCountryCode = (countryStr: string): string | null => {
    if (!countryStr) return null;

    const searchTerm = countryStr.toLowerCase().trim();

    const patterns = [
      /_([a-z]{2})$/,
      /([a-z]{2})$/,
      /^([a-z]{2})_/,
      /[_-]([a-z]{2})[_-]/,
    ];

    for (const pattern of patterns) {
      const match = searchTerm.match(pattern);
      if (match) {
        const extractedCode = match[1];
        const foundCountry = countries.find((c) => 
          c.code.toLowerCase() === extractedCode || 
          c.aliases.some((alias) => alias.toLowerCase() === extractedCode)
        );
        if (foundCountry) {
          return foundCountry.code;
        }
      }
    }

    const exactMatch = countries.find((c) => c.code.toLowerCase() === searchTerm);
    if (exactMatch) return exactMatch.code;

    const aliasMatch = countries.find(
      (c) => c.name.toLowerCase() === searchTerm || 
             c.aliases.some((alias) => alias.toLowerCase() === searchTerm)
    );
    if (aliasMatch) return aliasMatch.code;

    const partialMatch = countries.find(
      (c) =>
        c.name.toLowerCase().includes(searchTerm) ||
        c.aliases.some((alias) => alias.toLowerCase().includes(searchTerm)) ||
        searchTerm.includes(c.name.toLowerCase()) ||
        c.aliases.some((alias) => searchTerm.includes(alias.toLowerCase()))
    );
    if (partialMatch) return partialMatch.code;

    return null;
  };

  const parseProxyString = (proxyStr: string) => {
    if (!proxyStr.trim()) return null;

    const parts = proxyStr.split(":");
    if (parts.length >= 4) {
      const hostPart = parts[0].trim();
      const portPart = parts[1].trim();
      const userPart = parts[2].trim();
      const passwordPart = parts[3].trim();

      const userParts = userPart.split("-");
      if (userParts.length >= 3) {
        const userIdPart = userParts[0].trim();
        const countryPart = userParts[1].trim();
        const sessionIdPart = userParts[2].trim();

        const detectedCountry = findCountryCode(countryPart);
      
        return {
          host: hostPart,
          port: portPart,
          userId: userIdPart,
          country: detectedCountry || "",
          sessionId: sessionIdPart,
          password: passwordPart
        };
      }
    }
    return null;
  };

  const handlePasteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setManualPasteInput(value);

    if (value.includes(":") && value.split(":").length >= 4) {
      const parsedDetails = parseProxyString(value);
      if (parsedDetails) {
        setHost(parsedDetails.host);
        setPort(parsedDetails.port);
        setUserId(parsedDetails.userId);
        setCountry(parsedDetails.country);
        setSessionId(parsedDetails.sessionId);
        setPassword(parsedDetails.password);
        
        setParseSuccess(true);
        setTimeout(() => setParseSuccess(false), 2000);
        setManualPasteInput("");
      }
    }
  };

  const manualParse = () => {
    if (manualPasteInput.trim()) {
      const parsedDetails = parseProxyString(manualPasteInput.trim());
      if (parsedDetails) {
        setHost(parsedDetails.host);
        setPort(parsedDetails.port);
        setUserId(parsedDetails.userId);
        setCountry(parsedDetails.country);
        setSessionId(parsedDetails.sessionId);
        setPassword(parsedDetails.password);
        
        setParseSuccess(true);
        setTimeout(() => setParseSuccess(false), 2000);
        setManualPasteInput("");
      }
    } else {
      alert("⚠️ Please enter a proxy string.");
    }
  };

  const randomizeSession = () => {
    const randomSession = Math.floor(Math.random() * 900000) + 100000;
    setSessionId(randomSession.toString());
  };

  const handleCountryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().trim();
    setCountry(value);
    
    if (value.length > 0) {
      const filtered = countries.filter(c => 
        c.code.toLowerCase().includes(value) ||
        c.name.toLowerCase().includes(value) ||
        c.aliases.some(alias => alias.toLowerCase().includes(value))
      );
      setFilteredCountries(filtered);
      setShowCountrySuggestions(true);
    } else {
      setShowCountrySuggestions(false);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    setCountry(countryCode);
    setShowCountrySuggestions(false);
  };

  const handleCountryInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowCountrySuggestions(false), 200);
  };

  const isFieldEmpty = (value: string): boolean => !value || value.trim() === "";

  const generateBulkProxies = () => {
    if (isGenerating) return;
    
    const emptyFields: string[] = [];
    if (!host) emptyFields.push("Host");
    if (!port) emptyFields.push("Port");
    if (!userId) emptyFields.push("User ID");
    if (!country) emptyFields.push("Country");
    if (!password) emptyFields.push("Password");

    if (emptyFields.length > 0) {
      alert(`⚠️ Please fill in the following fields: ${emptyFields.join(", ")}`);
      return;
    }

    setIsGenerating(true);
    generateProxiesWithDuplicateCheck();
  };

  const generateProxiesWithDuplicateCheck = async () => {
    const amount = Number.parseInt(bulkAmount) || 1;

    if (amount > 5000) {
      alert("⚠️ Maximum 5000 proxies can be generated.");
      setBulkAmount("5000");
      setIsGenerating(false);
      return;
    }

    try {
      const proxies: string[] = [];

      // Generate unique proxies by checking against database
      let generated = 0;
      let attempts = 0;
      const maxAttempts = amount * 10; // Prevent infinite loops

      while (generated < amount && attempts < maxAttempts) {
        const batchSize = Math.min(100, amount - generated);
        const batchProxies: string[] = [];

        for (let i = 0; i < batchSize; i++) {
          const randomSession = Math.floor(Math.random() * 900000) + 100000;
          
          // Generate random s8 digit (1-15) for host server
          const s8Digit = Math.floor(Math.random() * 15) + 1;
          const modifiedHost = host.replace(/s\d+/, `s${s8Digit}`);
          
          let countryCode = country;
          if (country === "uk") {
            countryCode = "gb";
          }
          
          const finalCountryCode = countryCode.includes("_") ? countryCode : `lv_${countryCode}`;
          const proxy = `${modifiedHost}:${port}:${userId}-${finalCountryCode}-${randomSession}:${password}`;
          
          batchProxies.push(proxy);
        }

        // Check for duplicates
        const duplicates = await checkDuplicateProxies(batchProxies);
        const uniqueProxies = batchProxies.filter(proxy => !duplicates.includes(proxy));

        proxies.push(...uniqueProxies);
        generated += uniqueProxies.length;
        attempts += batchSize;
      }

      if (generated === 0) {
        alert("⚠️ Could not generate unique proxies. All generated proxies already exist.");
        return;
      }

      if (generated < amount) {
        alert(`⚠️ Only generated ${generated} unique proxies out of ${amount} requested. Some duplicates were found.`);
      }

      setBulkProxies(proxies.join("\n"));
      
    } catch (error) {
      console.error('Error generating proxies:', error);
      alert('⚠️ Error generating proxies. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyBulkToClipboard = async () => {
    if (bulkProxies) {
      setSaving(true);
      setSaveProgress(0);
      
      try {
        // Parse current proxies and save to database before copying
        if (currentUser) {
          const proxyLines = bulkProxies.split('\n').filter(line => line.trim());
          const proxyData = proxyLines.map(proxyString => {
            const parts = proxyString.split(':');
            if (parts.length >= 4) {
              const host = parts[0];
              const port = parts[1];
              const userPart = parts[2];
              const password = parts[3];
              
              const userParts = userPart.split('-');
              if (userParts.length >= 3) {
                const user_id = userParts[0];
                const country = userParts[1];
                const session_id = userParts[2];
                
                return {
                  proxy_string: proxyString,
                  host,
                  port,
                  user_id,
                  country,
                  session_id
                };
              }
            }
            return null;
          }).filter(Boolean) as Array<{
            proxy_string: string;
            host: string;
            port: string;
            user_id: string;
            country: string;
            session_id: string;
          }>;
          
          // Save to database using batch system
          if (proxyData.length > 0) {
            await saveGeneratedProxies(currentUser.id, proxyData);
            setSaveProgress(100);
          }
        }
        
        // Copy to clipboard
        await navigator.clipboard.writeText(bulkProxies);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        
      } catch (err) {
        console.error('Failed to save and copy proxies:', err);
        // Fallback copy method
        const textArea = document.createElement("textarea");
        textArea.value = bulkProxies;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (fallbackErr) {
          alert("⚠️ Failed to save and copy. Please try again.");
        }

        document.body.removeChild(textArea);
      } finally {
        setSaving(false);
        setSaveProgress(0);
      }
    }
  };

  const downloadProxies = () => {
    if (bulkProxies) {
      setSaving(true);
      setSaveProgress(0);
      
      // Parse current proxies and save to database before downloading
      if (currentUser) {
        const proxyLines = bulkProxies.split('\n').filter(line => line.trim());
        const proxyData = proxyLines.map(proxyString => {
          const parts = proxyString.split(':');
          if (parts.length >= 4) {
            const host = parts[0];
            const port = parts[1];
            const userPart = parts[2];
            const password = parts[3];
            
            const userParts = userPart.split('-');
            if (userParts.length >= 3) {
              const user_id = userParts[0];
              const country = userParts[1];
              const session_id = userParts[2];
              
              return {
                proxy_string: proxyString,
                host,
                port,
                user_id,
                country,
                session_id
              };
            }
          }
          return null;
        }).filter(Boolean) as Array<{
          proxy_string: string;
          host: string;
          port: string;
          user_id: string;
          country: string;
          session_id: string;
        }>;
        
        // Save to database using batch system
        if (proxyData.length > 0) {
          const saveAndDownload = async () => {
            try {
              await saveGeneratedProxies(currentUser.id, proxyData);
              setSaveProgress(100);
              
              // Download the file after saving
              const blob = new Blob([bulkProxies], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `proxies_${new Date().toISOString().split('T')[0]}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
            } catch (error) {
              console.error('Error saving and downloading proxies:', error);
              alert('⚠️ Error saving proxies to database.');
            } finally {
              setSaving(false);
              setSaveProgress(0);
            }
          };
          
          saveAndDownload();
        } else {
          // If no proxy data, just download without saving
          const blob = new Blob([bulkProxies], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `proxies_${new Date().toISOString().split('T')[0]}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setSaving(false);
          setSaveProgress(0);
        }
      } else {
        // If no current user, just download without saving
        const blob = new Blob([bulkProxies], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proxies_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSaving(false);
        setSaveProgress(0);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header with User Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Welcome, {currentUser?.user_name}
          </h2>
          {currentUser?.is_admin && (
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-full">
              Administrator
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={onShowProfile}
            variant="outline"
            size="lg"
            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <User className="h-5 w-5 mr-2" />
            Profile
          </Button>
          
          {currentUser?.is_admin && (
            <Button
              onClick={onShowAdmin}
              variant="outline"
              size="lg"
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Shield className="h-5 w-5 mr-2 text-red-600" />
              Admin Panel
            </Button>
          )}
          
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="lg"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
          disabled={!mounted}
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-5 w-5 text-amber-500 mr-2" />
          ) : (
            <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300 mr-2" />
          )}
          {mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Loading..."}
        </Button>
        
        <Button
          onClick={logout}
          variant="outline"
          size="lg"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 text-red-600 hover:text-red-700"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
        </div>
      </div>

      {/* Auto Parse Section */}
      <Card className="shadow-2xl border-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-white/20 rounded-lg">
              <Zap className="h-6 w-6" />
            </div>
            Smart Proxy Parser
            {parseSuccess && (
              <div className="flex items-center gap-2 ml-auto">
                <CheckCircle className="h-5 w-5 text-emerald-200" />
                <span className="text-sm">Parsed Successfully!</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Paste your proxy string here (format: host:port:user-country-session:password)"
                value={manualPasteInput}
                onChange={handlePasteInputChange}
                className="flex-1 h-12 border-2 border-emerald-200 dark:border-emerald-700 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualPasteInput.trim()) {
                    manualParse();
                  }
                }}
              />
              <Button 
                onClick={manualParse} 
                className="h-12 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <FileText className="h-5 w-5 mr-2" />
                Parse Now
              </Button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Auto-parsing is enabled. Just paste and the fields will be filled automatically!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Section */}
      <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-white/20 rounded-lg">
              <Settings className="h-6 w-6" />
            </div>
            Proxy Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="host" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Host Server
              </Label>
              <Input
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className={`h-12 bg-white dark:bg-slate-700 border-2 transition-all duration-300 ${
                  isFieldEmpty(host) 
                    ? "border-red-400 dark:border-red-500 focus:border-red-500" 
                    : "border-slate-200 dark:border-slate-600 focus:border-blue-500"
                }`}
                placeholder="e.g., b2b-s1.liveproxies.io"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port" className="text-slate-700 dark:text-slate-300 font-medium">
                Port Number
              </Label>
              <Input
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className={`h-12 bg-white dark:bg-slate-700 border-2 transition-all duration-300 ${
                  isFieldEmpty(port) 
                    ? "border-red-400 dark:border-red-500 focus:border-red-500" 
                    : "border-slate-200 dark:border-slate-600 focus:border-blue-500"
                }`}
                placeholder="e.g., 8080"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId" className="text-slate-700 dark:text-slate-300 font-medium">
                User ID
              </Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={`h-12 bg-white dark:bg-slate-700 border-2 transition-all duration-300 ${
                  isFieldEmpty(userId) 
                    ? "border-red-400 dark:border-red-500 focus:border-red-500" 
                    : "border-slate-200 dark:border-slate-600 focus:border-blue-500"
                }`}
                placeholder="Your unique user ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-slate-700 dark:text-slate-300 font-medium">
                Country Code
              </Label>
              <div className="relative">
                <Input
                  id="country"
                  value={country}
                  onChange={handleCountryInputChange}
                  onBlur={handleCountryInputBlur}
                  onFocus={() => {
                    if (country.length > 0) {
                      setShowCountrySuggestions(true);
                    }
                  }}
                  className={`h-12 bg-white dark:bg-slate-700 border-2 transition-all duration-300 ${
                    isFieldEmpty(country) 
                      ? "border-red-400 dark:border-red-500 focus:border-red-500" 
                      : "border-slate-200 dark:border-slate-600 focus:border-blue-500"
                  }`}
                  placeholder="Type country code or name (e.g., us, uk, bangladesh, pakistan)"
                />
                
                {/* Country Suggestions Dropdown */}
                {showCountrySuggestions && filteredCountries.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {filteredCountries.slice(0, 10).map((countryItem) => (
                      <button
                        key={countryItem.code}
                        type="button"
                        onClick={() => handleCountrySelect(countryItem.code)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{countryItem.flag}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-blue-600 dark:text-blue-400 font-semibold">
                                {countryItem.code.toUpperCase()}
                              </span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {countryItem.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionId" className="text-slate-700 dark:text-slate-300 font-medium">
                Session ID
              </Label>
              <div className="flex gap-3">
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className={`h-12 bg-white dark:bg-slate-700 border-2 transition-all duration-300 ${
                    isFieldEmpty(sessionId) 
                      ? "border-red-400 dark:border-red-500 focus:border-red-500" 
                      : "border-slate-200 dark:border-slate-600 focus:border-blue-500"
                  }`}
                  placeholder="e.g., 123456"
                />
                <Button
                  onClick={randomizeSession}
                  variant="outline"
                  size="lg"
                  className="h-12 px-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-300"
                >
                  <Shuffle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                Password
              </Label>
              <div className="flex gap-3">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`h-12 bg-white dark:bg-slate-700 border-2 transition-all duration-300 ${
                    isFieldEmpty(password) 
                      ? "border-red-400 dark:border-red-500 focus:border-red-500" 
                      : "border-slate-200 dark:border-slate-600 focus:border-blue-500"
                  }`}
                  placeholder="Your proxy password"
                  autoComplete="new-password"
                />
                <Button
                  onClick={() => setShowPassword(!showPassword)}
                  variant="outline"
                  size="lg"
                  className="h-12 px-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="w-full sm:w-40">
              <Label className="text-slate-700 dark:text-slate-300 font-medium mb-2 block">
                Quantity
              </Label>
              <Input
                type="number"
                placeholder="Amount"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                min="1"
                max="5000"
                className="h-12 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <Label className="text-slate-700 dark:text-slate-300 font-medium mb-2 block sm:invisible">
                Action
              </Label>
              <Button
                onClick={generateBulkProxies}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isGenerating || isSaving}
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </div>
                ) : (
                  <>
                    <Hash className="h-5 w-5 mr-2" />
                    Generate {bulkAmount} Proxies
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saving Progress */}
      {isSaving && (
        <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Saving proxies to database...
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {Math.round(saveProgress)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${saveProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Proxies Section */}
      {bulkProxies && (
        <Card className="shadow-2xl border-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="h-6 w-6" />
                </div>
                Generated Proxies ({bulkProxies.split("\n").length} total)
              </div>
              <div className="flex items-center gap-3">
                {copySuccess && (
                  <div className="flex items-center gap-2 text-emerald-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">Copied!</span>
                  </div>
                )}
                <Button
                  onClick={downloadProxies}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={copyBulkToClipboard}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300"
                  disabled={isSaving}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              value={bulkProxies}
              readOnly
              className="font-mono text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 min-h-40 resize-none"
              rows={Math.min(15, bulkProxies.split("\n").length)}
            />
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Total proxies: {bulkProxies.split("\n").length}</span>
              <span>
                {isSaving ? 'Saving to database...' : 'Ready for use in your applications'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}