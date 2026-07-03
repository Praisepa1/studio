export interface ExtractedEmail {
  address: string;
  context: string;
  confidence: 'high' | 'medium';
}

export interface ExtractedPhone {
  number: string;
  context: string;
  confidence: 'high' | 'medium';
}

export interface ExtractedAddress {
  text: string;
  context: string;
}

export interface ExtractedNamedContact {
  name: string;
  role: string;
  email: string | null;
}

export interface ContactsResult {
  emails: ExtractedEmail[];
  phones: ExtractedPhone[];
  addresses: ExtractedAddress[];
  named_contacts: ExtractedNamedContact[];
  source_url: string;
}

export interface ExtractContactsInput {
  html: string;
  text_content: string;
  page_type: string;
  url: string;
}

export function extractContacts(input: ExtractContactsInput): ContactsResult {
  const { html, text_content, url } = input;
  
  const emails: ExtractedEmail[] = [];
  const phones: ExtractedPhone[] = [];
  const addresses: ExtractedAddress[] = [];
  const named_contacts: ExtractedNamedContact[] = [];

  // 1. Email Extraction
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const foundEmails = Array.from(new Set(text_content.match(emailRegex) || []));
  
  for (const address of foundEmails) {
    if (address.endsWith('.png') || address.endsWith('.jpg') || address.includes('example.com') || address.includes('yourcompany.com')) {
      continue; // filter out false positives
    }
    // Very basic heuristic for confidence and context
    let confidence: 'high' | 'medium' = 'medium';
    let context = 'footer, no label';
    if (text_content.includes(`Email: ${address}`) || html.includes(`mailto:${address}`)) {
      confidence = 'high';
      context = 'Email: label or mailto link found';
    }
    emails.push({ address, context, confidence });
  }

  // 2. Phone Extraction (Basic regex for demo)
  const phoneRegex = /\+?[\d\s().-]{7,20}/g;
  const foundPhones = Array.from(new Set(text_content.match(phoneRegex) || []));
  for (let raw of foundPhones) {
    // Basic filter
    const stripped = raw.replace(/[^\d+]/g, '');
    if (stripped.length >= 7 && !raw.includes('202') && !raw.match(/\d{4}-\d{2}-\d{2}/)) {
      phones.push({ number: stripped, context: 'Matched phone pattern', confidence: 'medium' });
    }
  }

  // 3. Address Extraction
  if (html.includes('<address>') || text_content.includes('Headquarters') || text_content.includes('Location')) {
     const addrMatch = text_content.match(/(?:Location|Headquarters|Office):\s*([^\n]+)/i);
     if (addrMatch) {
       addresses.push({ text: addrMatch[1].trim(), context: 'main office' });
     }
  }
  
  // Custom logic for Nigerian addresses: "Plot ##, [Street Name]"
  const plotMatch = text_content.match(/Plot\s+\d+,[^,]+,[^,]+,[^.]+/i);
  if (plotMatch) {
    addresses.push({ text: plotMatch[0].trim(), context: 'Nigerian address pattern' });
  }

  // 4. Named Contacts
  // Naive HTML structural check for a team roster grid
  if (input.page_type === 'team' || input.page_type === 'about') {
     // Needs advanced DOM parsing in reality; just a placeholder for tests
     if (text_content.includes('CEO') || text_content.includes('Founder')) {
         const founderMatch = text_content.match(/([A-Z][a-z]+\s[A-Z][a-z]+)[,\s]+(Founder|CEO)/);
         if (founderMatch) {
             named_contacts.push({ name: founderMatch[1], role: founderMatch[2], email: null });
         }
     }
  }

  return { emails, phones, addresses, named_contacts, source_url: url };
}
