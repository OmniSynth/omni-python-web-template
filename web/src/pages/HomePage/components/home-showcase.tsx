import { HOME_SHOWCASE } from "../data";

/** 更多产品截图网格。 */
export function HomeShowcase() {
  return (
    <section id="showcase" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">产品界面一览</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">真实后台截图，所见即所得。</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HOME_SHOWCASE.map((item) => (
            <article
              key={item.title}
              className="surface-glass group overflow-hidden rounded-xl border border-border/60"
            >
              <div className="overflow-hidden border-b border-border/50">
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  loading="lazy"
                  className="h-44 w-full object-cover object-top transition duration-500 group-hover:scale-[1.02] sm:h-52"
                />
              </div>
              <div className="space-y-1.5 p-4">
                <h3 className="text-base font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
