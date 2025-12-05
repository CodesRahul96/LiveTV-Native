export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  licenseKey?: string;
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}
