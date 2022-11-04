// TODO enable and fix lint
import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject, Subscription } from 'rxjs';

export interface DropDownProps {
	isMenu?: boolean;
	anchor: React.ComponentType;
	children: React.ReactNode | (() => React.ReactNode);
	qeId?: string;
}

export interface DropDownState {
	opened: boolean;
	left: number;
	top: number;
}

require('./dropdown.scss');

const dropDownOpened = new BehaviorSubject<DropDown | null>(null);

export class DropDown extends React.Component<DropDownProps, DropDownState> {
	private el: HTMLDivElement | undefined | null;
	private content: HTMLDivElement | undefined | null;
	private subscriptions: Subscription[] | undefined | null;

	constructor(props: DropDownProps) {
		super(props);
		this.state = { opened: false, left: 0, top: 0 };
	}

	public render() {
		let children: React.ReactNode = null;
		if (typeof this.props.children === 'function') {
			if (this.state.opened) {
				const fun = this.props.children as () => React.ReactNode;
				children = fun();
			}
		} else {
			children = this.props.children as React.ReactNode;
		}

		return (
			<div className="argo-dropdown" ref={el => (this.el = el)}>
				<div
					qe-id={this.props.qeId}
					className="argo-dropdown__anchor"
					onClick={event => {
						this.open();
						event.stopPropagation();
					}}>
					<this.props.anchor />
				</div>
				{ReactDOM.createPortal(
					<div
						className={classNames('argo-dropdown__content', {
							opened: this.state.opened,
							'is-menu': this.props.isMenu,
						})}
						style={{ top: this.state.top, left: this.state.left }}
						ref={el => (this.content = el)}>
						{children}
					</div>,
					document.body
				)}
			</div>
		);
	}

	// TODO fix this part (V.T.)
	// public componentWillMount() {
	// 	this.subscriptions = [
	// 		Observable.merge(
	// 			dropDownOpened.filter(dropdown => dropdown !== this),
	// 			Observable.fromEvent(document, 'click').filter((event: Event) => {
	// 				return (
	// 					this.content &&
	// 					this.state.opened &&
	// 					!this.content.contains(event.target as Node) &&
	// 					!this.el.contains(event.target as Node)
	// 				);
	// 			})
	// 		).subscribe(() => {
	// 			this.close();
	// 		}),
	// 		Observable.fromEvent(document, 'scroll', true).subscribe(() => {
	// 			if (this.state.opened && this.content && this.el) {
	// 				this.setState(this.refreshState());
	// 			}
	// 		}),
	// 	];
	// }

	public componentWillUnmount() {
		(this.subscriptions || []).forEach(s => s.unsubscribe());
		this.subscriptions = [];
	}

	public close() {
		this.setState({ opened: false });
	}

	private refreshState() {
		const anchor = (this.el as any).querySelector('.argo-dropdown__anchor') as HTMLElement;
		const { top, left } = anchor.getBoundingClientRect();
		const anchorHeight = anchor.offsetHeight + 2;

		const newState = { left: this.state.left, top: this.state.top, opened: this.state.opened };
		// Set top position
		if (this.content && this.content.offsetHeight + top + anchorHeight > window.innerHeight) {
			newState.top = top - this.content.offsetHeight - 2;
		} else {
			newState.top = top + anchorHeight;
		}

		// Set left position
		if (this.content && this.content.offsetWidth + left > window.innerWidth) {
			newState.left = left - this.content.offsetWidth + anchor.offsetWidth;
		} else {
			newState.left = left;
		}
		return newState;
	}

	private open() {
		if (!this.content || !this.el) {
			return;
		}

		const newState = this.refreshState();
		newState.opened = true;
		this.setState(newState);
		dropDownOpened.next(this);
	}
}
