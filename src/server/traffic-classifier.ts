// ============================================================
// Traffic Classifier
// Uses reverse DNS lookup + domain pattern matching
// to classify traffic into application categories
// ============================================================

import { DnsCache } from './dns-cache';
import { type FlowRecord, type ClassifiedFlow, PROTOCOL_MAP } from '../types/traffic';
import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';
import path from 'path';

/** Domain pattern → Application name mapping */
const DOMAIN_PATTERNS: [RegExp, string][] = [
  // Video Streaming
  [/googlevideo\.com$/i, 'YouTube'],
  [/youtube\.com$/i, 'YouTube'],
  [/ytimg\.com$/i, 'YouTube'],
  [/youtu\.be$/i, 'YouTube'],
  [/yt3\.ggpht\.com$/i, 'YouTube'],
  [/netflix\.com$/i, 'Netflix'],
  [/nflxvideo\.net$/i, 'Netflix'],
  [/nflximg\.net$/i, 'Netflix'],
  [/nflxso\.net$/i, 'Netflix'],
  [/nflxext\.com$/i, 'Netflix'],

  // Social Media
  [/instagram\.com$/i, 'Instagram'],
  [/cdninstagram\.com$/i, 'Instagram'],
  [/facebook\.com$/i, 'Facebook'],
  [/fbcdn\.net$/i, 'Facebook'],
  [/fb\.com$/i, 'Facebook'],
  [/fbsbx\.com$/i, 'Facebook'],
  [/tiktok\.com$/i, 'TikTok'],
  [/tiktokcdn\.com$/i, 'TikTok'],
  [/musical\.ly$/i, 'TikTok'],
  [/tiktokv\.com$/i, 'TikTok'],
  [/twitter\.com$/i, 'Twitter/X'],
  [/twimg\.com$/i, 'Twitter/X'],
  [/x\.com$/i, 'Twitter/X'],
  [/t\.co$/i, 'Twitter/X'],
  [/linkedin\.com$/i, 'LinkedIn'],
  [/licdn\.com$/i, 'LinkedIn'],

  // Messaging
  [/whatsapp\.net$/i, 'WhatsApp'],
  [/whatsapp\.com$/i, 'WhatsApp'],
  [/telegram\.org$/i, 'Telegram'],
  [/t\.me$/i, 'Telegram'],
  [/telegram\.me$/i, 'Telegram'],
  [/telesco\.pe$/i, 'Telegram'],
  [/discord\.com$/i, 'Discord'],
  [/discord\.gg$/i, 'Discord'],
  [/discordapp\.com$/i, 'Discord'],
  [/discordapp\.net$/i, 'Discord'],

  // Music & Audio
  [/spotify\.com$/i, 'Spotify'],
  [/scdn\.co$/i, 'Spotify'],
  [/spotifycdn\.com$/i, 'Spotify'],

  // Gaming & Streaming
  [/twitch\.tv$/i, 'Twitch'],
  [/ttvnw\.net$/i, 'Twitch'],
  [/jtvnw\.net$/i, 'Twitch'],
  [/steampowered\.com$/i, 'Steam'],
  [/steamcontent\.com$/i, 'Steam'],
  [/steamcdn-a\.akamaihd\.net$/i, 'Steam'],

  // Google Services
  [/google\.com$/i, 'Google'],
  [/googleapis\.com$/i, 'Google'],
  [/gstatic\.com$/i, 'Google'],
  [/google\.co\.id$/i, 'Google'],
  [/1e100\.net$/i, 'Google'],
  [/googleusercontent\.com$/i, 'Google'],

  // Microsoft
  [/microsoft\.com$/i, 'Microsoft'],
  [/microsoftonline\.com$/i, 'Microsoft'],
  [/msftconnecttest\.com$/i, 'Microsoft'],
  [/live\.com$/i, 'Microsoft'],
  [/office\.com$/i, 'Microsoft'],
  [/office365\.com$/i, 'Microsoft'],

  // Developer
  [/github\.com$/i, 'GitHub'],
  [/githubusercontent\.com$/i, 'GitHub'],
  [/githubassets\.com$/i, 'GitHub'],

  // E-commerce (Indonesia)
  [/shopee\.co\.id$/i, 'Shopee'],
  [/shopee\.com$/i, 'Shopee'],
  [/tokopedia\.com$/i, 'Tokopedia'],
  [/tokopedia\.net$/i, 'Tokopedia'],

  // Ride-hailing / Super Apps
  [/gojek\.com$/i, 'Gojek'],
  [/go-jek\.com$/i, 'Gojek'],
  [/grab\.com$/i, 'Grab'],

  // CDN (classify last since these are generic)
  [/akamai\.net$/i, 'Akamai CDN'],
  [/akamaized\.net$/i, 'Akamai CDN'],
  [/cloudfront\.net$/i, 'AWS CloudFront'],
  [/cloudflare\.com$/i, 'Cloudflare'],
];

/** Known port-based classification (fallback when DNS fails) */
const PORT_APPS: Record<number, string> = {
  80: 'HTTP',
  443: 'HTTPS',
  53: 'DNS',
  22: 'SSH',
  21: 'FTP',
  25: 'SMTP',
  110: 'POP3',
  143: 'IMAP',
  3389: 'RDP',
  8080: 'HTTP Proxy',
};

/**
 * Direct IP → Application mapping.
 * Used as the first classification layer before DNS reverse lookup.
 * Useful for well-known service IPs that don't resolve to meaningful hostnames.
 */
const IP_TO_APP: Record<string, [string, string]> = {
  // YouTube / Google Video
  '142.250.190.78': ['YouTube', 'lhr48s29-in-f14.1e100.net'],
  '172.217.14.110': ['YouTube', 'par10s38-in-f14.1e100.net'],
  // Instagram / Meta
  '157.240.1.174': ['Instagram', 'instagram-p42-shv-01-lhr3.fbcdn.net'],
  '157.240.13.174': ['Instagram', 'instagram-p3-shv-01-lhr3.fbcdn.net'],
  // Facebook
  '157.240.1.35': ['Facebook', 'edge-star-mini-shv-01-lhr3.facebook.com'],
  // TikTok
  '161.117.197.194': ['TikTok', 'v16m-default.tiktokcdn.com'],
  '103.136.220.30': ['TikTok', 'mon-tiktok-sg.byteoversea.net'],
  // WhatsApp
  '157.240.1.60': ['WhatsApp', 'whatsapp-chatd-edge-shv-01-lhr3.facebook.com'],
  // Google
  '142.250.190.46': ['Google', 'lhr48s29-in-f14.1e100.net'],
  '142.250.190.14': ['Google', 'lhr25s31-in-f14.1e100.net'],
  // Netflix
  '54.74.73.31': ['Netflix', 'nflx-ec2-eu-west-1.amazonaws.com'],
  // Spotify
  '35.186.224.25': ['Spotify', 'audio4-fa.scdn.co'],
  // Twitter/X
  '104.244.42.65': ['Twitter/X', 'abs.twimg.com'],
  // Discord
  '162.159.128.233': ['Discord', 'gateway-us-east1-b.discord.gg'],
  // GitHub
  '140.82.121.4': ['GitHub', 'github.com'],
  // Telegram
  '149.154.175.50': ['Telegram', 'telegram-dc5.t-online.de'],
  // DNS
  '8.8.8.8': ['DNS', 'dns.google'],
  '1.1.1.1': ['DNS', 'one.one.one.one'],
  // Shopee
  '104.18.24.186': ['Shopee', 'shopee.co.id'],
  // Tokopedia
  '13.250.155.62': ['Tokopedia', 'tokopedia.com'],
};

let flowIdCounter = 0;

export class TrafficClassifier {
  private dnsCache: DnsCache;
  private asnDb: any = null;

  constructor(dnsCache?: DnsCache) {
    this.dnsCache = dnsCache || new DnsCache();
    try {
      // Read the GeoLite2 ASN DB directly from the installed package
      const dbPath = path.resolve(process.cwd(), 'node_modules/@maxminddatabase/geolite2/database/GeoLite2-ASN.mmdb');
      const dbBuffer = fs.readFileSync(dbPath);
      this.asnDb = Reader.openBuffer(dbBuffer);
      console.log('[TrafficClassifier] MaxMind GeoLite2 ASN Database loaded successfully.');
    } catch (err) {
      console.warn('[TrafficClassifier] Failed to load ASN Database:', err);
    }
  }

  /**
   * Classify a raw flow record into a named application.
   */
  async classify(record: FlowRecord): Promise<ClassifiedFlow> {
    const dstIp = record.ipv4_dst_addr;
    const srcIp = record.ipv4_src_addr;

    let hostname = dstIp;
    let application = 'Other';

    // Layer 1: Direct IP → App mapping (fastest, most reliable)
    const ipMatch = IP_TO_APP[dstIp];
    if (ipMatch) {
      application = ipMatch[0];
      hostname = ipMatch[1];
    } else {
      // Layer 2: ASN Lookup (Open-Source classification)
      let asnOrg = null;
      if (this.asnDb) {
        try {
          const asnData = this.asnDb.asn(dstIp);
          if (asnData && asnData.autonomousSystemOrganization) {
            asnOrg = asnData.autonomousSystemOrganization;
            const mappedApp = this.mapAsnToApp(asnOrg);
            
            // If mapped, use our clean name. Otherwise use the raw ASN Organization name.
            application = mappedApp || asnOrg;
            hostname = asnOrg; // Temporary hostname until DNS lookup
          }
        } catch {
          // IP not found in ASN DB or invalid IP
        }
      }

      // Layer 3: Reverse DNS lookup + domain pattern matching
      try {
        const hostnames = await this.dnsCache.reverseLookup(dstIp);
        if (hostnames.length > 0) {
          const dnsHostname = hostnames[0];
          
          // Overwrite the IP or ASN org with the actual DNS hostname
          if (hostname === dstIp || hostname === asnOrg) {
            hostname = dnsHostname;
          }

          // If DNS matches a known pattern, it overrides the general ASN classification
          const domainMatch = this.matchDomain(dnsHostname);
          if (domainMatch !== 'Other') {
            application = domainMatch;
          }
        }
      } catch {
        // DNS lookup failed
      }

      // Layer 4: Port-based classification (fallback)
      if (application === 'Other') {
        const portApp = PORT_APPS[record.l4_dst_port];
        if (portApp) {
          application = portApp;
        }
      }
    }

    const protocolName = PROTOCOL_MAP[record.protocol] || `PROTO:${record.protocol}`;

    const duration = record.last_switched && record.first_switched
      ? Math.max(0, record.last_switched - record.first_switched)
      : 0;

    // Use a more robust unique ID to prevent React key collisions
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const flowId = `flow-${Date.now()}-${randomSuffix}-${++flowIdCounter}`;

    return {
      id: flowId,
      routerIp: record.routerIp,
      srcIp,
      dstIp,
      srcPort: record.l4_src_port || 0,
      dstPort: record.l4_dst_port || 0,
      protocol: protocolName,
      bytes: record.in_bytes || 0,
      packets: record.in_pkts || 0,
      hostname,
      application,
      timestamp: Date.now(),
      duration,
      tcpFlags: record.tcp_flags || 0,
      inputInt: record.input_snmp || 0,
      outputInt: record.output_snmp || 0,
      tos: record.ip_tos || 0,
      nextHop: record.ipv4_next_hop || '',
      collectorPort: record.collectorPort,
    };
  }

  /**
   * Classify multiple flow records in parallel.
   */
  async classifyBatch(records: FlowRecord[]): Promise<ClassifiedFlow[]> {
    return Promise.all(records.map((r) => this.classify(r)));
  }

  /**
   * Match a hostname against known domain patterns.
   */
  private matchDomain(hostname: string): string {
    for (const [pattern, app] of DOMAIN_PATTERNS) {
      if (pattern.test(hostname)) {
        return app;
      }
    }
    return 'Other';
  }

  /**
   * Map messy ASN Organization names to clean application names
   */
  private mapAsnToApp(orgName: string): string | null {
    const org = orgName.toLowerCase();
    if (org.includes('google')) return 'Google';
    if (org.includes('facebook') || org.includes('meta platforms')) return 'Facebook';
    if (org.includes('netflix')) return 'Netflix';
    if (org.includes('cloudflare')) return 'Cloudflare';
    if (org.includes('amazon') || org.includes('aws')) return 'AWS';
    if (org.includes('microsoft')) return 'Microsoft';
    if (org.includes('apple')) return 'Apple';
    if (org.includes('valve')) return 'Steam';
    if (org.includes('akamai')) return 'Akamai CDN';
    if (org.includes('fastly')) return 'Fastly';
    if (org.includes('twitter')) return 'Twitter/X';
    if (org.includes('tiktok') || org.includes('bytedance')) return 'TikTok';
    if (org.includes('shopee') || org.includes('sea group')) return 'Shopee';
    if (org.includes('gojek')) return 'Gojek';
    if (org.includes('grab')) return 'Grab';
    if (org.includes('alibaba')) return 'Alibaba';
    if (org.includes('tencent')) return 'Tencent';
    if (org.includes('digitalocean')) return 'DigitalOcean';
    if (org.includes('linode')) return 'Linode';
    if (org.includes('ovh')) return 'OVH';
    
    return null; // Let it fall through to raw ASN name
  }

  /** Get DNS cache stats */
  getCacheStats() {
    return this.dnsCache.getStats();
  }
}
