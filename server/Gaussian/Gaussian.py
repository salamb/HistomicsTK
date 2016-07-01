#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################

import sys

from ctk_cli import CLIArgumentParser
import SimpleITK as sitk

import logging
logging.basicConfig()

# From https://itk.org/SimpleITKDoxygen/html/Python_2SimpleGaussian_8py-
# example.html
# and adapted to be used with histomics tk as a module


def main(args):

    imgReader = sitk.ImageFileReader()
    imgReader.SetFileName(args.inputImageFile)
    image = imgReader.Execute()
 
    pixelID = image.GetPixelIDValue()
   
    gaussianFx = sitk.SmoothingRecursiveGaussianImageFilter()
    gaussianFx.SetSigma(float(args.sigma))
    image = gaussianFx.Execute(image)
   
    caster = sitk.CastImageFilter()
    caster.SetOutputPixelType(pixelID)
    image = caster.Execute(image)
   
    imgWriter = sitk.ImageFileWriter()
    imgWriter.SetFileName(args.outputImageFile)
    imgWriter.Execute(image)

if __name__ == "__main__":
    main(CLIArgumentParser().parse_args())
