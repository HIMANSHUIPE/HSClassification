import React from 'react';
import { ExternalLink, BookOpen, Globe, FileText, Scale } from 'lucide-react';

export default function ResourceLinks() {
  const hsRepositories = [
    {
      name: 'WCO Harmonized System',
      url: 'https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx',
      description: 'Official World Customs Organization HS documentation',
      icon: Globe,
    },
    {
      name: 'WTO Tariff Download Facility',
      url: 'https://www.wto.org/english/tratop_e/tariffs_e/tariff_data_e.htm',
      description: 'Download complete tariff schedules by country',
      icon: FileText,
    },
    {
      name: 'US HTS (Harmonized Tariff Schedule)',
      url: 'https://hts.usitc.gov/',
      description: 'United States International Trade Commission',
      icon: BookOpen,
    },
    {
      name: 'EU TARIC Database',
      url: 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp',
      description: 'European Union integrated tariff consultation',
      icon: BookOpen,
    },
    {
      name: 'UK Trade Tariff',
      url: 'https://www.trade-tariff.service.gov.uk/',
      description: 'UK government trade tariff lookup tool',
      icon: BookOpen,
    },
    {
      name: 'UN Comtrade Database',
      url: 'https://comtrade.un.org/',
      description: 'International trade statistics database',
      icon: Globe,
    },
  ];

  const dutyReferences = [
    {
      name: 'US Customs and Border Protection',
      url: 'https://www.cbp.gov/trade/basic-import-export',
      description: 'Import/export regulations and duty information',
      icon: Scale,
    },
    {
      name: 'FTA Tariff Tool',
      url: 'https://www.usitc.gov/tata/hts/index.htm',
      description: 'Free Trade Agreement tariff lookup',
      icon: FileText,
    },
    {
      name: 'Market Access Map',
      url: 'https://www.macmap.org/',
      description: 'Tariff and market access data for all countries',
      icon: Globe,
    },
    {
      name: 'EU Access2Markets',
      url: 'https://trade.ec.europa.eu/access-to-markets/',
      description: 'EU trade barriers, tariffs, and requirements',
      icon: BookOpen,
    },
    {
      name: 'WTO I-TIP Goods',
      url: 'https://i-tip.wto.org/goods/default.aspx',
      description: 'Integrated analysis and retrieval of trade data',
      icon: Globe,
    },
    {
      name: 'India Customs Duty Calculator',
      url: 'https://www.icegate.gov.in/',
      description: 'Indian Customs EDI Gateway',
      icon: Scale,
    },
  ];

  const bindingRulings = [
    {
      name: 'EU BTI (Binding Tariff Information)',
      url: 'https://ec.europa.eu/taxation_customs/dds2/ebti/ebti_consultation.jsp',
      description: 'Search EU binding tariff decisions',
      icon: FileText,
    },
    {
      name: 'US Customs Rulings Database (CROSS)',
      url: 'https://rulings.cbp.gov/',
      description: 'US Customs and Border Protection ruling search',
      icon: BookOpen,
    },
    {
      name: 'Canada AMPS Rulings',
      url: 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/2024/menu-eng.html',
      description: 'Canadian customs tariff and rulings',
      icon: FileText,
    },
  ];

  const renderLinkSection = (
    title: string,
    description: string,
    links: Array<{ name: string; url: string; description: string; icon: any }>
  ) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="space-y-3">
        {links.map((link, index) => {
          const Icon = link.icon;
          return (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
            >
              <div className="bg-white border border-gray-300 p-2 rounded-lg mr-3 flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {link.name}
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </div>
                <div className="text-xs text-gray-600">{link.description}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-blue-900 mb-1">Official HS Code Resources</h2>
            <p className="text-sm text-blue-700">
              Direct links to authoritative customs and tariff databases worldwide. Always verify AI
              classifications against official sources for compliance.
            </p>
          </div>
        </div>
      </div>

      {renderLinkSection(
        'HS Code Repositories',
        'Official harmonized system nomenclature and tariff databases',
        hsRepositories
      )}

      {renderLinkSection(
        'Duty & Tariff References',
        'Import duty calculators and free trade agreement resources',
        dutyReferences
      )}

      {renderLinkSection(
        'Binding Rulings & Precedents',
        'Search official customs classification decisions and binding tariff information',
        bindingRulings
      )}
    </div>
  );
}
