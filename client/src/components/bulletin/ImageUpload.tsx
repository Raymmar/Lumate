import { UnsplashPicker } from "@/components/ui/unsplash-picker";

//import { Button } from "@/components/ui/button"; //removed
//import { ImageIcon } from "lucide-react"; //removed

//interface ImageUploadProps { //removed
//  onImageSelect: (url: string) => void;
//  defaultValue?: string;
//} //removed

//export function ImageUpload({ onImageSelect, defaultValue }: ImageUploadProps) { //removed
//  return (
//    <div className="space-y-2">
//      <Button 
//        variant="outline" 
//        className="w-full justify-start text-muted-foreground hover:text-foreground"
//        onClick={() => {}}
//      >
//        {defaultValue ? (
//          <img 
//            src={defaultValue} 
//            alt="Selected image"
//            className="h-8 w-8 rounded object-cover mr-2"
//          />
//        ) : (
//          <ImageIcon className="h-4 w-4 mr-2" />
//        )}
//        {defaultValue ? "Change image" : "Choose image"}
//      </Button>
//      <UnsplashPicker
//        value={defaultValue}
//        onChange={onImageSelect}
//      />
//    </div>
//  );
//} //removed