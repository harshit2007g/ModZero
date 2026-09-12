import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { Seo } from "../components/seo/Seo";

const LINKS = [
  { to: "/", title: "Feed", body: "Recent activity across the network." },
  { to: "/compose", title: "Publish a work", body: "Register an image and post it." },
  { to: "/verify", title: "Check an image", body: "Match a picture against the registry." },
  { to: "/studio", title: "Your studio", body: "Posts, works and reputation." },
];

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="That page does not exist on ModZero. Browse the feed, publish a work, or check an image against the registry."
        noIndex
      />

      <section className="relative overflow-hidden">
        <div className="bloom drift" />
        <div className="relative mx-auto max-w-[860px] px-8 py-32 text-center">
          <p className="font-mono text-[20px] font-semibold text-brand">404</p>
          <h1 className="mt-5 text-[clamp(44px,6vw,76px)] font-bold leading-[1.05] tracking-[-0.035em] text-navy">
            No record at this address.
          </h1>
          <p className="mx-auto mt-7 max-w-lg text-[21px] leading-relaxed text-slate">
            The page you asked for does not exist. If you followed a link to a specific work or
            claim, the ID may be wrong or it may not have been registered on this network.
          </p>
          <div className="mt-11 flex flex-wrap justify-center gap-4">
            <Link to="/">
              <Button size="lg">Back to the feed</Button>
            </Link>
            <Link to="/verify">
              <Button size="lg" variant="outline">
                Check an image
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid gap-5 text-left sm:grid-cols-2">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                <Card hover className="h-full p-7">
                  <h2 className="text-[20px] font-bold tracking-tight text-navy">{link.title}</h2>
                  <p className="mt-2 text-[17px] leading-relaxed text-slate">{link.body}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
