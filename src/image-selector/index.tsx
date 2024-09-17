export function ImageSelector({
  images,
  selectedImage,
  setSelectedImage,
}: {
  images: string[];
  selectedImage: any;
  setSelectedImage: any;
}) {
  function selectCallback(src: string) {
    if (selectedImage === src) {
      setSelectedImage("");
    } else {
      setSelectedImage(src);
    }
  }
  return (
    <div className="flex gap-3">
      <div>Hintergrundbild</div>
      <div className="overflow-x-scroll pb-4 image-carousel">
        <div className="flex gap-3">
          {images.map((image) => (
            <Image
              key={image}
              src={image}
              selected={selectedImage === image}
              onSelect={selectCallback}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Image({
  src,
  selected = false,
  onSelect = undefined,
}: {
  src: string;
  selected?: boolean;
  onSelect: any;
}) {
  return (
    <>
      <div className="relative" onClick={(e) => onSelect(src)}>
        <img
          alt="Cat 1"
          className={
            "border-4 transition-all duration-300 ease-in-out hover:border-yellow-300 hover:shadow-lg max-w-none"
          }
          height="50"
          src={src}
          style={{
            aspectRatio: "100/100",
            objectFit: "cover",
          }}
          width="50"
        />
        {selected ? (
          <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1">
            <CheckIcon className="text-white" />
          </div>
        ) : null}
      </div>
    </>
  );
}

function CheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
