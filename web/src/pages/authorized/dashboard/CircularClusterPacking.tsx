import { ZModelCard } from 'components/molecules/cards/Card';
import { EnvironmentCard, EnvironmentCards } from 'components/molecules/cards/EnvironmentCards';
import { ConfigCard } from 'components/molecules/cards/EnvironmentComponentCards';
import { TeamCard } from 'components/molecules/cards/TeamCards';
import * as d3 from 'd3';
import React, { FC, useEffect, useRef, useState } from 'react';

import { getClassName } from './helpers';
import { TooltipD3 } from './TooltipD3';

export interface Cluster {
	data: any;
}

export const CircularClusterPacking: FC<any> = (props: Cluster) => {
	const packContainer = useRef<HTMLDivElement>(null);
	const [tooltipData, setTooltipData] = useState<any>(null);
	const { data } = props;
	const { height, width } = { height: 800, width: 800 };
	const temp: any = d3.scaleLinear().domain([0, 5]);

	const color = (i: number) => ['#47C9A7', '#252625', '#47C9A7', '#252625'][i]; //temp.range(['hsl(152,80%,80%)', 'hsl(228,30%,40%)']).interpolate(d3.interpolateHcl);

	const pack = (data: any) =>
		d3.pack().size([width, height]).padding(10)(
			d3
				.hierarchy(data)
				.sum(d => d.value)
				.sort((a: any, b: any) => b.value - a.value)
		);

	const initializeD3CirclePack = (data: any) => {
		const root = pack(data);
		let focus = root;
		let view: any;

		const c = (d: any) => {
			const cd = color(d);
			if (cd) {
				return cd.toString();
			}
			return '';
		};

		const svg = d3
			.create('svg')
			.attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
			.style('display', 'block')
			.style('margin', '0 -14px')
			.style('background', 'transparent')
			.style('cursor', 'pointer')
			.on('click', event => zoom(event, root));

		const node = svg
			.append('g')
			.selectAll('circle')
			.data(root.descendants().slice(1))
			.join('circle')
			.attr('class', (d: any): any => 'wedge' + getClassName(d.data.componentStatus || d.data.syncStatus))
			.attr('stroke', '#888')
			.on('mousemove', function (e: any, data: any) {
				const tooltipData = {
					top: e.layerY,
					left: e.clientX - (packContainer.current as any).getBoundingClientRect().x + 60,
					classNames: 'com-cards tooltip-d3 teams',
				};
				if (data?.data?.labels?.type === 'project') {
					setTooltipData({
						card: <TeamCard team={data.data} />,
						...tooltipData,
					});
				} else if (data?.data?.labels?.type === 'environment') {
					setTooltipData({
						card: <EnvironmentCard environment={data.data} />,
						...tooltipData,
					});
				} else if (data?.data?.labels?.type === 'config') {
					setTooltipData({
						card: <ConfigCard showAll={false} config={data.data} onClick={() => {}} />,
						...tooltipData,
					});
				}
				(packContainer.current?.parentElement?.style as any).zIndex = 99;
			})
			.on('click', (event, d) => focus !== d && d.children && (zoom(event, d), event.stopPropagation()));

		const label = svg
			.append('g')
			.attr('pointer-events', 'none')
			.attr('text-anchor', 'middle')
			.selectAll('text')
			.data(root.descendants())
			.join('text')
			.style('fill-opacity', d => (d.parent === root ? 1 : 0))
			.style('font-size', '1.2em')
			.style('font-family', 'DM Sans')
			.style('display', d => (d.parent === root ? 'inline' : 'none'))
			.style('fill', '#222')
			.text((d: any) => d.data.componentName || d.data.displayValue);

		zoomTo([root.x, root.y, root.r * 2]);

		function zoomTo(v: any) {
			const k = width / v[2];

			view = v;

			label.attr('transform', (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
			node.attr('transform', (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
			node.attr('r', d => d.r * k);
		}

		function zoom(event: any, d: any) {
			const focus0 = focus;

			focus = d;

			const transition: any = svg
				.transition()
				.duration(event.altKey ? 7500 : 750)
				.tween('zoom', d => {
					const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
					return t => zoomTo(i(t));
				});

			label
				.filter(function (d: any) {
					const t: any = this;
					return (this && d.parent === focus) || t.style.display === 'inline';
				})
				.transition(transition)
				.style('fill-opacity', (d: any) => (d.parent === focus ? 1 : 0))
				.on('start', function (d: any) {
					const t: any = this;
					if (d.parent === focus) t.style.display = 'inline';
				})
				.on('end', function (d: any) {
					const t: any = this;
					if (d.parent !== focus) t.style.display = 'none';
				});
		}

		return svg.node();
	};

	useEffect(() => {
		const pack = initializeD3CirclePack({
			name: 'root',
			children: data,
		});
		const container: HTMLDivElement = packContainer.current as HTMLDivElement;
		if (container && pack) {
			const svg = container.querySelector('svg');
			svg && container.removeChild(svg);
			container.appendChild(pack);
		}
	}, [data]);

	return (
		<div
			ref={packContainer}
			onMouseLeave={() => {
				(packContainer.current?.parentElement?.style as any).zIndex = 0;
				setTooltipData({
					...tooltipData,
					classNames: 'com-cards tooltip-d3 teams hide',
				});
			}}>
			<TooltipD3 data={tooltipData} />
		</div>
	);
};