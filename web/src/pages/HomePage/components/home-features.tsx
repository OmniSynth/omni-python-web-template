import { HOME_FEATURES } from "../data";

/** 产品功能区：文案 + 界面截图交错展示。 */
export function HomeFeatures() {
  return (
    <section id="features" className="border-t border-border/60 bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            核心能力<span className="text-primary">一站式覆盖</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            从登录接入到权限治理、组织运营与审计追溯，开箱即用。
          </p>
        </div>

        <div className="mt-14 space-y-16 lg:space-y-24">
          {HOME_FEATURES.map((feature, index) => {
            const reverse = index % 2 === 1;
            return (
              <article key={feature.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
                <div className={reverse ? "lg:order-2" : undefined}>
                  <p className="text-xs font-medium tracking-widest text-primary">0{index + 1}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {feature.description}
                  </p>
                </div>
                <div className={reverse ? "lg:order-1" : undefined}>
                  <div className="surface-glass overflow-hidden rounded-xl border border-border/60">
                    <img
                      src={feature.image}
                      alt={feature.imageAlt}
                      loading="lazy"
                      className="h-auto w-full object-cover object-top"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
