export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}
