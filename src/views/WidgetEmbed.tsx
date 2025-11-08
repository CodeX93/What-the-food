import dynamic from "next/dynamic";

const WidgetEmbedClient = dynamic(
  () => import("@/components/WidgetEmbed/WidgetEmbedClient").then((mod) => mod.WidgetEmbedClient),
  { ssr: false }
);

const WidgetEmbed = () => {
  return <WidgetEmbedClient />;
};

export default WidgetEmbed;

