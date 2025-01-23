class TariffChartCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.tariffs || !Array.isArray(config.tariffs)) {
      throw new Error("Tariffs configuration is required and should be an array");
    }
    this.config = {
      currentTimeLine: {
        borderColor: config.currentTimeLine?.borderColor || "#00BFFF",
      },
      tariffs: config.tariffs
    };
  }

  getCardSize() {
    return this.config?.layout?.cardSize || 3;
  }

  connectedCallback() {
    if (!this.content) {
      this.style.display = "flex";
      this.style.flexDirection = "column";
      this.style.justifyContent = "center";
      this.style.alignItems = "center";
      this.style.height = "100%";
    
      this.content = document.createElement("div");
      this.content.style.width = "100%";
      this.content.style.height =  "100%";
      this.appendChild(this.content);
      this._renderChart();
    }
  }

  async _renderChart() {
    if (!window.Chart) {
      const script = document.createElement("script");
      script.src = "/hacsfiles/tariff-chart/chartjs/chart.js";
      
      annotationScript.onerror = () => {
        // Fallback to manual installation path
        annotationScript.src = "/local/tariff_chart/chartjs/chart.js";
        document.head.appendChild(annotationScript);
      };     
      
      document.head.appendChild(script);
      await new Promise((resolve) => (script.onload = resolve));
    }
    if (!window.ChartAnnotation) {
      const annotationScript = document.createElement("script");
      annotationScript.src = "/hacsfiles/tariff-chart/chartjs/chartjs-plugin-annotation.js";
        
      annotationScript.onerror = () => {
        // Fallback to manual installation path
        annotationScript.src = "/local/tariff_chart/chartjs/chartjs-plugin-annotation.js";
        document.head.appendChild(annotationScript);
      };
      
      document.head.appendChild(annotationScript);
      await new Promise((resolve) => (annotationScript.onload = resolve));
    }

    const canvas = document.createElement("canvas");
    this.content.innerHTML = "";
    this.content.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const tariffs = this.config.tariffs;

    const timePoints = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        timePoints.push(
          `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        );
      }
    }
    timePoints.push("24:00");
  
    const datasets = tariffs.map((tariff) => {
      const data = Array(timePoints.length).fill(null);

      tariff.timeFrames.forEach((frame) => {
        const [start, end] = frame.split("-").map((time) => {
          if (time === "24:00") return timePoints.length - 1;
          return timePoints.indexOf(time);
        });

        for (let i = start; i < end; i++) {
          data[i] = tariff.value;
        }
      });
  
      return {
        label: tariff.name,
        data: data,
        stepped: true,
        spanGaps: false,
        borderColor: tariff.color,
        borderWidth: 2,
        backgroundColor: tariff.color,
        fill: { target: "origin" },
        pointRadius: 0
      };
    });

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    const currentTimeIndex = timePoints.findIndex((time, i) => {
      const [h, m] = time.split(":").map(Number);
      const nextTime = timePoints[i + 1]
        ? timePoints[i + 1].split(":").map(Number)
        : [24, 0];
      const startHour = h + m / 60;
      const endHour = nextTime[0] + nextTime[1] / 60;
      return currentHour >= startHour && currentHour < endHour;
    });

    new Chart(ctx, {
      type: "line",
      data: {
        labels: timePoints,
        datasets: datasets
      },
      options: {
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              currentTimeLine: {
                type: "line",
                xMin: currentTimeIndex,
                xMax: currentTimeIndex,
                borderColor: this.config.currentTimeLine.borderColor,
                borderWidth: 2,
                label: {
                  enabled: true,
                  content: `Current Time: ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
                  position: "end",
                  backgroundColor: "#ffffff",
                  color: "#000000"
                }
              }
            }
          }
        },
        scales: {
            x: {
              ticks: {
                color: "#ffffff",
                callback: function(val, index) {
                  const time = this.getLabelForValue(index);
                  const [h, m] = time.split(":").map(Number);
                  if (m === 0) {
                    if (h === 0) return "0"; // Remove "24:00" at the beginning
                    return h === 24 ? "24" : `${h}`; // Show "24" at the end
                  }
                  return ""; // Show only full hours
                },
                autoSkip: false
              },
              title: {
                display: true,
                text: "Time of Day",
                color: "#ffffff"
              },
              grid: {
                display: false // Remove grid lines
              }
            },
            y: {
              min: 20,
              title: {
                display: true,
                text: "Tariff (ct/kWh)",
                color: "#ffffff"
              },
              ticks: {
                stepSize: 5,
                color: "#ffffff"
              },
              grid: {
                display: false // Remove grid lines
              }
            }
        }
      }
    });
  }
}

customElements.define("tariff-chart-card", TariffChartCard);
