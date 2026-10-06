import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { IconComponent, type IconName } from '../ui';
import type { SiteAgent } from './site-agent.model';

/**
 * How a site agent is attached to the venue network: LAN or Wi-Fi with its
 * SSID, and the address it holds. Purely presentational; the agent reports the
 * values on its heartbeat.
 */
@Component({
  selector: 'app-site-agent-network',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TranslocoDirective],
  template: `
    <span
      *transloco="let t"
      class="inline-flex min-w-0 items-center gap-1.5"
      [attr.title]="agent().networkInterface"
      data-testid="agent-network"
    >
      @if (icon(); as name) {
        <mns-icon [name]="name" [size]="14" class="shrink-0 text-muted" />
      }
      <span class="truncate">
        @switch (agent().networkKind) {
          @case ('wifi') {
            {{
              agent().networkSsid
                ? t('siteAgents.network.wifiSsid', { ssid: agent().networkSsid })
                : t('siteAgents.network.wifi')
            }}
          }
          @case ('ethernet') {
            {{ t('siteAgents.network.ethernet') }}
          }
          @case ('unknown') {
            {{ t('siteAgents.network.unknown') }}
          }
          @default {
            {{ t('siteAgents.network.notReported') }}
          }
        }
        @if (agent().networkIp; as ip) {
          · <span class="font-mono">{{ ip }}</span>
        }
      </span>
    </span>
  `,
})
export class SiteAgentNetwork {
  readonly agent = input.required<SiteAgent>();

  protected readonly icon = computed<IconName | null>(() => {
    switch (this.agent().networkKind) {
      case 'wifi':
        return 'Wifi';
      case 'ethernet':
        return 'Globe';
      default:
        return null;
    }
  });
}
