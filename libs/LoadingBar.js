class LoadingBar {
	constructor(options) {
		this.domElement = document.createElement("div");
		this.domElement.style.position = 'fixed';
		this.domElement.style.top = '0';
		this.domElement.style.left = '0';
		this.domElement.style.width = '100%';
		this.domElement.style.height = '100%';
		this.domElement.style.background = '#000';
		this.domElement.style.opacity = '0.7';
		this.domElement.style.display = 'flex';
		this.domElement.style.alignItems = 'center';
		this.domElement.style.justifyContent = 'center';
		this.domElement.style.zIndex = '1111';

		// Bar container
		const barBase = document.createElement("div");
		barBase.style.background = '#FFFFFF';
		barBase.style.width = '50%';
		barBase.style.minWidth = '250px';
		barBase.style.borderRadius = '10px';
		barBase.style.height = '20px';
		barBase.style.position = 'relative';
		this.domElement.appendChild(barBase);

		// Progress bar fill
		const bar = document.createElement("div");
		bar.style.background = '#EF4A3E';
		bar.style.borderRadius = '10px';
		bar.style.height = '100%';
		bar.style.width = '0';
		bar.style.transition = 'width 0.3s ease';
		barBase.appendChild(bar);
		this.progressBar = bar;

		// Percentage text
		const percentText = document.createElement("div");
		percentText.style.position = 'absolute';
		percentText.style.width = '100%';
		percentText.style.height = '100%';
		percentText.style.display = 'flex';
		percentText.style.alignItems = 'center';
		percentText.style.justifyContent = 'center';
		percentText.style.fontFamily = 'sans-serif';
		percentText.style.fontSize = '14px';
		percentText.style.color = '#fff';
		barBase.appendChild(percentText);
		this.percentText = percentText;

		document.body.appendChild(this.domElement);
	}

	set progress(delta) {
		const percent = Math.floor(delta * 100);
		this.progressBar.style.width = `${percent}%`;
		this.percentText.textContent = `${percent}%`;
	}

	set visible(value) {
		this.domElement.style.display = value ? 'flex' : 'none';
	}
}

export { LoadingBar };
